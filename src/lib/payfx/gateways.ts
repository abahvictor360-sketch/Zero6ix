import "server-only";
import type { CurrencyCode } from "./catalog";
import type { PayfxOrder } from "./store";

/**
 * Flutterwave + Paystack for PayFX, ported from payfx (src/gateways/*).
 * Supports NGN and USD. Keys: FLUTTERWAVE_SECRET_KEY (or FLW_SECRET_KEY) and
 * PAYSTACK_SECRET_KEY. Currencies each account can take: PAYFX_FLW_CURRENCIES
 * (default NGN,USD) and PAYFX_PAYSTACK_CURRENCIES (default NGN).
 */
export type GatewayId = "flutterwave" | "paystack";

interface Verified { paid: boolean; status: string; transactionId: string; channel?: string; paidAt?: string }

const list = (v: string | undefined, d: string) => (v || d).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) as CurrencyCode[];

// Test-only overrides for the gateway API base URLs.
const FLW = () => process.env.PAYFX_FLW_API_BASE || "https://api.flutterwave.com/v3";
const PS = () => process.env.PAYFX_PAYSTACK_API_BASE || "https://api.paystack.co";

const flwSecret = () => (process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY || "").trim();
const psSecret = () => (process.env.PAYSTACK_SECRET_KEY || "").trim();

async function call<T>(url: string, secret: string, init: RequestInit, ok: (json: Record<string, unknown>) => boolean, name: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !ok(json)) throw new Error(`${name}: ${(json.message as string) || res.status}`);
  return json.data as T;
}

const flutterwave = {
  configured: () => Boolean(flwSecret()),
  currencies: () => list(process.env.PAYFX_FLW_CURRENCIES, "NGN,USD"),
  async initialize(order: PayfxOrder, redirectUrl: string, businessName: string) {
    const data = await call<{ link: string }>(`${FLW()}/payments`, flwSecret(), {
      method: "POST",
      body: JSON.stringify({
        tx_ref: order.payRef,
        amount: order.total,
        currency: order.currency,
        redirect_url: redirectUrl,
        customer: { email: order.customer.email, name: order.customer.name, phonenumber: order.customer.phone || undefined },
        customizations: { title: businessName, description: `Invoice ${order.invoiceNumber}` },
        meta: { invoice: order.invoiceNumber },
      }),
    }, (j) => j.status === "success", "Flutterwave");
    return data.link;
  },
  async verify(order: PayfxOrder, payRef: string, transactionId?: string): Promise<Verified> {
    const url = transactionId && /^\d+$/.test(transactionId)
      ? `${FLW()}/transactions/${transactionId}/verify`
      : `${FLW()}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(payRef)}`;
    const d = await call<Record<string, unknown>>(url, flwSecret(), { method: "GET" }, (j) => j.status === "success", "Flutterwave");
    const paid = d.tx_ref === payRef && d.status === "successful" && d.currency === order.currency
      && Math.round(Number(d.amount) * 100) >= Math.round(order.total * 100);
    return { paid, status: String(d.status), transactionId: String(d.id), channel: d.payment_type as string, paidAt: d.created_at as string };
  },
};

const paystack = {
  configured: () => Boolean(psSecret()),
  currencies: () => list(process.env.PAYFX_PAYSTACK_CURRENCIES, "NGN"),
  async initialize(order: PayfxOrder, callbackUrl: string) {
    const data = await call<{ authorization_url: string }>(`${PS()}/transaction/initialize`, psSecret(), {
      method: "POST",
      body: JSON.stringify({
        email: order.customer.email,
        amount: Math.round(order.total * 100),
        currency: order.currency,
        reference: order.payRef,
        callback_url: callbackUrl,
        metadata: {
          invoice: order.invoiceNumber,
          custom_fields: [
            { display_name: "Invoice", variable_name: "invoice", value: order.invoiceNumber },
            { display_name: "Customer", variable_name: "customer", value: order.customer.name },
          ],
        },
      }),
    }, (j) => j.status !== false, "Paystack");
    return data.authorization_url;
  },
  async verify(order: PayfxOrder, payRef: string): Promise<Verified> {
    const d = await call<Record<string, unknown>>(`${PS()}/transaction/verify/${encodeURIComponent(payRef)}`, psSecret(), { method: "GET" }, (j) => j.status !== false, "Paystack");
    const paid = d.status === "success" && d.currency === order.currency && Number(d.amount) >= Math.round(order.total * 100);
    return { paid, status: String(d.status), transactionId: String(d.id), channel: d.channel as string, paidAt: (d.paid_at || d.paidAt) as string };
  },
};

export const GATEWAYS = { flutterwave, paystack } as const;

export function gatewayStatus() {
  return {
    flutterwave: { on: flutterwave.configured(), currencies: flutterwave.currencies() },
    paystack: { on: paystack.configured(), currencies: paystack.currencies() },
  };
}
