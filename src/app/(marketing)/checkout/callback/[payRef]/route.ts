import { NextResponse, type NextRequest } from "next/server";
import { getOrder } from "@/lib/payfx/store";
import { baseRef, confirmPayment, siteBase } from "@/lib/payfx/orders";

export const dynamic = "force-dynamic";

/** Where Flutterwave (redirect_url) and Paystack (callback_url) send the customer back. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ payRef: string }> }) {
  const { payRef } = await params;
  const order = await getOrder(baseRef(payRef)).catch(() => null);
  if (!order) return new NextResponse("Invoice not found", { status: 404 });
  if (request.nextUrl.searchParams.get("status") !== "cancelled") {
    await confirmPayment(payRef, request.nextUrl.searchParams.get("transaction_id") ?? undefined).catch((e) => console.error("[payfx] confirm", e));
  }
  return NextResponse.redirect(`${siteBase(request)}/checkout/invoice/${order.ref}`);
}
