import { NextResponse } from "next/server";
import { verifyFlutterwaveSignature } from "@/lib/payments/flutterwave";
import { confirmPayment } from "@/lib/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Flutterwave webhook: authenticated via the `verif-hash` secret, then re-verified via API. */
export async function POST(request: Request) {
  if (!verifyFlutterwaveSignature(request.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: { event?: string; type?: string; data?: { tx_ref?: string; txRef?: string; status?: string } };
  try { event = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const ref = event.data?.tx_ref ?? event.data?.txRef;
  const isCharge = event.event === "charge.completed" || event.type === "charge.completed";
  if (isCharge && ref?.startsWith("WPP-") && event.data?.status === "successful") {
    try {
      await confirmPayment(ref);
    } catch (e) {
      console.error("[webhook:flutterwave]", e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
