import "server-only";
import { safeEqual } from "@/lib/crypto";
import { site } from "@/lib/site";
import type { InitArgs, VerifiedTx } from "./paystack";

const BASE = "https://api.flutterwave.com/v3";
const secret = () => {
  const s = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!s) throw new Error("FLUTTERWAVE_SECRET_KEY is not set");
  return s;
};

export async function flutterwaveInitialize(a: InitArgs & { name?: string; phone?: string | null }): Promise<string> {
  const res = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: a.reference,
      amount: a.amountNgn.toFixed(2),
      currency: "NGN",
      redirect_url: a.callbackUrl,
      payment_options: "card,banktransfer,ussd",
      customer: { email: a.email, name: a.name, phonenumber: a.phone ?? undefined },
      customizations: { title: site.name, description: String(a.metadata.request_reference ?? "Payment") },
      meta: a.metadata,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success") throw new Error(json.message ?? "Flutterwave initialisation failed");
  return json.data.link as string;
}

/** Verify by our tx_ref (works for both redirect and webhook flows). */
export async function flutterwaveVerify(txRef: string): Promise<VerifiedTx> {
  const res = await fetch(`${BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = await res.json();
  const d = json.data ?? {};
  return {
    ok: res.ok && json.status === "success" && d.status === "successful" && d.currency === "NGN" && d.tx_ref === txRef,
    reference: d.tx_ref ?? txRef,
    // `amount` is the order amount; `charged_amount` may include fees borne by the customer.
    amountNgn: Number(d.amount ?? 0),
    currency: d.currency,
    transactionId: String(d.id ?? ""),
    channel: d.payment_type ?? null,
    raw: { id: d.id, status: d.status, payment_type: d.payment_type, created_at: d.created_at, processor_response: d.processor_response },
  };
}

/** Flutterwave sends the dashboard-configured secret hash in the `verif-hash` header. */
export function verifyFlutterwaveSignature(header: string | null) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  return Boolean(expected && header && safeEqual(header, expected));
}
