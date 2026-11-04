import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment } from "@/lib/payments/service";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Payment status", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Gateway redirect target. Never trusts query params: the reference is looked
 * up, tied back to this quote token, and verified server-to-server.
 */
export default async function PaymentCallback({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string; tx_ref?: string; status?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const reference = (sp.reference ?? sp.trxref ?? sp.tx_ref ?? "").slice(0, 80);

  let outcome: "paid" | "pending" | "failed" = "failed";
  let requestId: string | null = null;
  let amount: number | null = null;

  if (reference && sp.status !== "cancelled") {
    const db = createAdminClient();
    const { data: payment } = await db.from("payments").select("id, request_id, amount_ngn, quotes!inner(payment_token)").eq("reference", reference).maybeSingle();
    const quoteToken = (payment?.quotes as unknown as { payment_token: string } | null)?.payment_token;
    if (payment && quoteToken === token) {
      requestId = payment.request_id;
      amount = Number(payment.amount_ngn);
      try {
        const r = await confirmPayment(reference);
        outcome = r.status === "paid" || r.status === "already_paid" ? "paid" : r.status === "pending" ? "pending" : "failed";
      } catch (e) {
        console.error("[pay/callback]", e);
        outcome = "pending";
      }
    }
  }

  const view = {
    paid: { Icon: CheckCircle2, color: "text-emerald-500", title: "Payment successful", body: `We've received ${amount ? formatMoney(amount) : "your payment"}. Your invoice and receipt are on their way by email, and we're starting on your order now.` },
    pending: { Icon: Clock, color: "text-amber-500", title: "Payment processing", body: "Your bank is still confirming the payment. This usually takes a minute or two. We'll notify you as soon as it's confirmed. No need to pay again." },
    failed: { Icon: XCircle, color: "text-red-500", title: "Payment not completed", body: "The payment was cancelled or didn't go through. You haven't been charged. You can try again while your quote is valid." },
  }[outcome];

  return (
    <section className="container max-w-lg py-20 text-center">
      <view.Icon className={`mx-auto h-14 w-14 ${view.color}`} />
      <h1 className="mt-4 text-2xl font-bold">{view.title}</h1>
      <p className="muted mt-2">{view.body}</p>
      <div className="mt-8 flex justify-center gap-3">
        {outcome === "failed" && <Link href={`/pay/${token}`} className="btn btn-dark">Try again</Link>}
        {outcome === "pending" && <Link href={`/pay/${token}/callback?reference=${encodeURIComponent(reference)}`} className="btn btn-outline">Check again</Link>}
        <Link href={requestId ? `/dashboard/requests/${requestId}` : "/dashboard"} className="btn btn-outline">Go to my order</Link>
      </div>
    </section>
  );
}
