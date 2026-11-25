import { NextResponse } from "next/server";
import { GATEWAYS } from "@/lib/payfx/gateways";
import { getOrder, linkExpired, updateOrder } from "@/lib/payfx/store";
import { confirmPayment, siteBase } from "@/lib/payfx/orders";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Opens the gateway's checkout for an unpaid invoice. ?via=paystack|flutterwave
 * lets the customer choose (e.g. on a payment link); otherwise the invoice's own gateway is used.
 */
export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const base = siteBase(request);
  let order = await getOrder(ref).catch(() => null);
  if (!order) return new NextResponse("Invoice not found", { status: 404 });
  const invoice = `${base}/checkout/invoice/${order.ref}`;
  if (order.status === "paid") return NextResponse.redirect(invoice);
  if (linkExpired(order)) return NextResponse.redirect(`${base}/checkout/link/${order.ref}`);
  const via = new URL(request.url).searchParams.get("via");
  try {
    // The previous attempt may have gone through after all (checked with the gateway it used).
    order = (await confirmPayment(order.payRef).catch(() => null)) ?? order;
    if (order.status === "paid") return NextResponse.redirect(invoice);
    // Customer picked a different card gateway: switch to it if it can take this currency.
    if ((via === "paystack" || via === "flutterwave") && via !== order.gateway) {
      const gw = GATEWAYS[via];
      if (gw.configured() && gw.currencies().includes(order.currency)) {
        order = (await updateOrder(order.ref, { gateway: via })) ?? order;
      }
    }
    // Bank transfer orders: show the account details and receipt upload.
    if (order.gateway === "transfer") return NextResponse.redirect(`${base}/checkout/link/${order.ref}?pay=transfer`);
    const attempts = (order.attempts ?? 0) + 1;
    order = (await updateOrder(order.ref, { attempts, payRef: `${order.ref}-R${attempts}` }))!;
    const callback = `${base}/checkout/callback/${order.payRef}`; // returns to the invoice or payment-link page
    const url = order.gateway === "paystack"
      ? await GATEWAYS.paystack.initialize(order, callback)
      : await GATEWAYS.flutterwave.initialize(order, callback, site.name);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("[payfx] retry failed", e);
    return new NextResponse("Could not reach the payment gateway. Please try again later.", { status: 502 });
  }
}
