import { NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/payments/paystack";
import { confirmPayment } from "@/lib/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack webhook. Signature = HMAC-SHA512(raw body, secret key).
 * The event body is only used to find the reference; the transaction is
 * re-verified with Paystack's API before anything is marked paid.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  if (event.event === "charge.success" && event.data?.reference?.startsWith("WPP-")) {
    try {
      await confirmPayment(event.data.reference);
    } catch (e) {
      console.error("[webhook:paystack]", e);
      // 500 makes Paystack retry later.
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
