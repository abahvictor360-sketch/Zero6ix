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
  return (res.status === 204 ? [] : res.json()) as Promise<T>;
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
