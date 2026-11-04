import "server-only";
import { hmacHex, safeEqual } from "@/lib/crypto";

const BASE = "https://api.paystack.co";
const secret = () => {
  const s = process.env.PAYSTACK_SECRET_KEY;
  if (!s) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return s;
};

export interface InitArgs {
  email: string;
  amountNgn: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export async function paystackInitialize(a: InitArgs): Promise<string> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: a.email,
      amount: Math.round(a.amountNgn * 100), // kobo
      currency: "NGN",
      reference: a.reference,
      callback_url: a.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
      metadata: a.metadata,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message ?? "Paystack initialisation failed");
  return json.data.authorization_url as string;
}

export interface VerifiedTx {
  ok: boolean;
  reference: string;
  amountNgn: number;
  currency: string;
  transactionId: string;
  channel: string | null;
  raw: unknown;
}

export async function paystackVerify(reference: string): Promise<VerifiedTx> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = await res.json();
  const d = json.data ?? {};
  return {
    ok: res.ok && json.status === true && d.status === "success" && d.currency === "NGN",
    reference: d.reference ?? reference,
    amountNgn: Number(d.amount ?? 0) / 100,
    currency: d.currency,
    transactionId: String(d.id ?? ""),
    channel: d.channel ?? null,
    raw: { id: d.id, status: d.status, channel: d.channel, paid_at: d.paid_at, gateway_response: d.gateway_response },
  };
}

/** Paystack signs the raw body with HMAC-SHA512 using the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  return safeEqual(hmacHex("sha512", secret(), rawBody), signature);
}
