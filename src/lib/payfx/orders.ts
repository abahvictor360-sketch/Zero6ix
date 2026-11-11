import "server-only";
import { GATEWAYS } from "./gateways";
import { getOrder, updateOrder, type PayfxOrder } from "./store";

/** Each checkout attempt has its own reference: REF, then REF-R1, REF-R2… for retries. */
export const baseRef = (payRef: string) => String(payRef || "").replace(/-R\d+$/, "");

/**
 * Ask the gateway whether a payment reference is paid and record it on the
 * order. Never trusts redirect parameters. Safe to call repeatedly.
 */
export async function confirmPayment(payRef: string, transactionId?: string): Promise<PayfxOrder | null> {
  const order = await getOrder(baseRef(payRef));
  if (!order || order.status === "paid") return order;
  // Bank transfers are confirmed by an admin, not by a gateway.
  if (order.gateway === "transfer") return order;
  const gw = GATEWAYS[order.gateway];
  if (!gw?.configured()) return order;
  const result = await gw.verify(order, payRef, transactionId);
  if (!result.paid) return order;
  return updateOrder(order.ref, {
    status: "paid",
    paidAt: result.paidAt || new Date().toISOString(),
    paidRef: payRef,
    transactionId: result.transactionId,
    channel: result.channel,
  });
}

export function siteBase(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
