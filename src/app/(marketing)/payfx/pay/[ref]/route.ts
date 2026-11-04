import { NextResponse } from "next/server";
import { GATEWAYS } from "@/lib/payfx/gateways";
import { getOrder, updateOrder } from "@/lib/payfx/store";
import { confirmPayment, siteBase } from "@/lib/payfx/orders";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Re-opens checkout for an unpaid invoice with the same gateway. */
export async function GET(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const base = siteBase(request);
  let order = await getOrder(ref).catch(() => null);
  if (!order) return new NextResponse("Invoice not found", { status: 404 });
  const invoice = `${base}/payfx/invoice/${order.ref}`;
  if (order.status === "paid") return NextResponse.redirect(invoice);
  try {
    // The previous attempt may have gone through after all.
    order = (await confirmPayment(order.payRef).catch(() => null)) ?? order;
    if (order.status === "paid") return NextResponse.redirect(invoice);
    const attempts = (order.attempts ?? 0) + 1;
    order = (await updateOrder(order.ref, { attempts, payRef: `${order.ref}-R${attempts}` }))!;
    const callback = `${base}/payfx/callback/${order.payRef}`;
    const url = order.gateway === "paystack"
      ? await GATEWAYS.paystack.initialize(order, callback)
      : await GATEWAYS.flutterwave.initialize(order, callback, site.name);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("[payfx] retry failed", e);
    return new NextResponse("Could not reach the payment gateway. Please try again later.", { status: 502 });
  }
}
