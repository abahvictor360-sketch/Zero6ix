import "server-only";
import type { CurrencyCode, LogoKey } from "./catalog";
import { envValue } from "@/lib/env";

/**
 * PayFX orders live in the Supabase table public.payfx_orders, shared with
 * payfx.vercel.app (same shape, same invoice-number sequence). Uses the
 * service-role key over REST, so this module must only run on the server.
 *
 * Env: PAYFX_SUPABASE_URL (or SUPABASE_URL) + PAYFX_SUPABASE_SERVICE_ROLE_KEY.
 * Deliberately separate from NEXT_PUBLIC_SUPABASE_* so it never switches on
 * Web Purchase accounts.
 */
export interface PayfxLine {
  id: string;
  name: string;
  subtitle?: string;
  period: string;
  purpose: string;
  amount: number;     // in the order currency
  ngnAmount: number;
  logo: LogoKey;
}

export interface PayfxOrder {
  ref: string;
  invoiceNumber: string;
  status: "pending" | "paid";
  gateway: "flutterwave" | "paystack";
  payRef: string;
  attempts?: number;
  customer: { name: string; email: string; phone: string; company: string };
  currency: CurrencyCode;
  rate: number;
  items: PayfxLine[];
  total: number;
  ngnTotal: number;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  paidRef?: string;
  transactionId?: string;
  channel?: string;
  source?: string;
}

const base = () => (envValue("PAYFX_SUPABASE_URL") || envValue("SUPABASE_URL")).replace(/\/$/, "");
const key = () => envValue("PAYFX_SUPABASE_SERVICE_ROLE_KEY");
export const storeConfigured = () => Boolean(base() && key());

async function rest<T>(query: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}/rest/v1/payfx_orders${query}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface Row { ref: string; invoice_number: string; status: PayfxOrder["status"]; data: PayfxOrder }
const toOrder = (row?: Row | null): PayfxOrder | null =>
  row ? { ...row.data, ref: row.ref, invoiceNumber: row.invoice_number, status: row.status } : null;
const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

export async function createOrder(order: Omit<PayfxOrder, "invoiceNumber">) {
  const [row] = await rest<Row[]>("", {
    method: "POST",
    body: JSON.stringify({ ref: order.ref, email: order.customer.email, status: order.status, data: order }),
  });
  return toOrder(row)!;
}

export async function getOrder(ref: string) {
  if (!/^[A-Z0-9-]{6,80}$/i.test(ref)) return null;
  const [row] = await rest<Row[]>(`?ref=${eq(ref)}&limit=1`);
  return toOrder(row);
}

export async function updateOrder(ref: string, patch: Partial<PayfxOrder>) {
  const order = await getOrder(ref);
  if (!order) return null;
  const next = { ...order, ...patch, updatedAt: new Date().toISOString() };
  const [row] = await rest<Row[]>(`?ref=${eq(ref)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: next.status, data: next, updated_at: next.updatedAt }),
  });
  return toOrder(row);
}

export async function findByInvoice(invoiceNumber: string, email: string) {
  const inv = String(invoiceNumber).trim();
  if (!/^[A-Z0-9-]{3,40}$/i.test(inv)) return null;
  const [row] = await rest<Row[]>(`?invoice_number=ilike.${encodeURIComponent(inv)}&email=${eq(String(email).trim().toLowerCase())}&limit=1`);
  return toOrder(row);
}
