import "server-only";
import { envValue } from "@/lib/env";
import { supabaseAuthHeaders, type PayfxOrder } from "./store";

/**
 * Admin reads/writes on the leadloop Supabase project with the service-role
 * key: every product (including hidden ones) and every order.
 */
const base = () => (envValue("PAYFX_SUPABASE_URL") || envValue("SUPABASE_URL")).replace(/\/$/, "");
const key = () => envValue("PAYFX_SUPABASE_SERVICE_ROLE_KEY");
export const adminStoreConfigured = () => Boolean(base() && key());

export class StoreError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!adminStoreConfigured()) throw new StoreError("The database key (PAYFX_SUPABASE_SERVICE_ROLE_KEY) is not set in Vercel.", 0);
  const res = await fetch(`${base()}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      ...supabaseAuthHeaders(key()),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new StoreError(body.message ?? `Database error ${res.status}`, res.status, body.code);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : []) as T;
}

/* ---------- Products ---------- */

export interface ProductRow {
  id: string;
  name: string;
  subtitle: string | null;
  period: string;
  purpose: string;
  amount_ngn: number;
  logo: string;
  is_test: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export type ProductInput = Pick<ProductRow, "name" | "subtitle" | "period" | "purpose" | "amount_ngn" | "logo" | "active" | "sort_order">;

const num = (r: ProductRow): ProductRow => ({ ...r, amount_ngn: Number(r.amount_ngn) });

export async function listProducts() {
  const rows = await rest<ProductRow[]>("payfx_products?select=*&order=sort_order.asc,name.asc");
  return rows.map(num);
}

export async function getProduct(id: string) {
  const [row] = await rest<ProductRow[]>(`payfx_products?id=eq.${encodeURIComponent(id)}&limit=1`);
  return row ? num(row) : null;
}

export async function createProduct(id: string, input: ProductInput) {
  const [row] = await rest<ProductRow[]>("payfx_products", { method: "POST", body: JSON.stringify({ id, ...input }) });
  return num(row);
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const [row] = await rest<ProductRow[]>(`payfx_products?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }),
  });
  return row ? num(row) : null;
}

export async function deleteProduct(id: string) {
  await rest(`payfx_products?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ---------- Orders ---------- */

export interface OrderSummary extends PayfxOrder { email: string }

interface OrderRow { ref: string; invoice_number: string; status: PayfxOrder["status"]; email: string; data: PayfxOrder }

export async function listOrders(opts: { status?: "paid" | "pending"; q?: string; limit?: number } = {}) {
  const params = new URLSearchParams({ select: "ref,invoice_number,status,email,data", order: "data->>createdAt.desc", limit: String(opts.limit ?? 200) });
  if (opts.status) params.set("status", `eq.${opts.status}`);
  const q = opts.q?.trim().replace(/[,()*%]/g, " ").trim();
  if (q) params.set("or", `(invoice_number.ilike.*${q}*,email.ilike.*${q}*,ref.ilike.*${q}*)`);
  const rows = await rest<OrderRow[]>(`payfx_orders?${params}`);
  return rows.map<OrderSummary>((r) => ({ ...r.data, ref: r.ref, invoiceNumber: r.invoice_number, status: r.status, email: r.email }));
}

export async function deleteOrder(ref: string) {
  await rest(`payfx_orders?ref=eq.${encodeURIComponent(ref)}`, { method: "DELETE" });
}

/* ---------- Activity log ---------- */

export interface LogRow { id: number; at: string; admin_email: string; action: string; target: string | null; details: Record<string, unknown> }

/** Best effort: never blocks an admin action if the log table is missing. */
export async function logAdmin(adminEmail: string, action: string, target?: string | null, details: Record<string, unknown> = {}) {
  try {
    await rest("payfx_admin_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ admin_email: adminEmail, action, target: target ?? null, details }) });
  } catch (e) {
    console.warn("[checkout-admin] log failed", e instanceof Error ? e.message : e);
  }
}

export async function listLog(limit = 200) {
  return rest<LogRow[]>(`payfx_admin_log?select=*&order=at.desc&limit=${limit}`);
}

/** True if a sign-in link nonce was already used (recorded in the log). */
export async function nonceUsed(nonce: string) {
  try {
    const rows = await rest<{ id: number }[]>(`payfx_admin_log?select=id&action=eq.sign_in&details->>nonce=eq.${encodeURIComponent(nonce)}&limit=1`);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/* ---------- Settings ---------- */

export async function getSettings(): Promise<Record<string, unknown>> {
  const rows = await rest<{ key: string; value: unknown }[]>("payfx_settings?select=key,value");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(k: string, value: unknown, by: string) {
  await rest("payfx_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: k, value, updated_at: new Date().toISOString(), updated_by: by }),
  });
}

/* ---------- Contact messages ---------- */

export type MessageStatus = "new" | "read" | "replied" | "archived";
export interface MessageRow {
  id: string; created_at: string; name: string; email: string; phone: string | null; country: string | null;
  enquiry: string | null; subject: string; message: string; status: MessageStatus; notes: string | null;
}

export async function listMessages(status?: MessageStatus | "open") {
  const filter = status === "open" ? "&status=in.(new,read)" : status ? `&status=eq.${status}` : "";
  return rest<MessageRow[]>(`payfx_contact_messages?select=*&order=created_at.desc&limit=300${filter}`);
}

export async function countNewMessages() {
  try {
    const rows = await rest<{ id: string }[]>("payfx_contact_messages?select=id&status=eq.new&limit=1000");
    return rows.length;
  } catch {
    return 0;
  }
}

export async function updateMessage(id: string, patch: Partial<Pick<MessageRow, "status" | "notes">>) {
  await rest(`payfx_contact_messages?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}

export async function deleteMessage(id: string) {
  await rest(`payfx_contact_messages?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Called by the public contact form. Returns false (never throws) if it can't store. */
export async function storeContactMessage(m: Omit<MessageRow, "id" | "created_at" | "status" | "notes">) {
  if (!adminStoreConfigured()) return false;
  try {
    await rest("payfx_contact_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(m) });
    return true;
  } catch (e) {
    console.warn("[contact] could not store message in leadloop", e instanceof Error ? e.message : e);
    return false;
  }
}
