import { NextResponse } from "next/server";
import { findByInvoice, storeConfigured } from "@/lib/payfx/store";

export const dynamic = "force-dynamic";

/** "Find my invoice": invoice number + the email used at checkout. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { invoiceNumber?: string; email?: string };
  if (!storeConfigured()) return NextResponse.json({ error: "Invoice lookup is not available yet." }, { status: 503 });
  const order = await findByInvoice(body.invoiceNumber ?? "", body.email ?? "").catch(() => null);
  if (!order) return NextResponse.json({ error: "No invoice matches that number and email." }, { status: 404 });
  return NextResponse.json({ invoiceUrl: `/checkout/invoice/${order.ref}` });
}
