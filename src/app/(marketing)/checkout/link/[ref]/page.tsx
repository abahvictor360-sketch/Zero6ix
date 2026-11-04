import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, FileText, Lock, ShieldCheck } from "lucide-react";
import { getOrder, linkExpired } from "@/lib/payfx/store";
import { confirmPayment } from "@/lib/payfx/orders";
import { money } from "@/lib/payfx/catalog";
import { LOGOS, logoSvg } from "@/lib/payfx/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Payment request",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const dateStr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }) : "");

/** Customer-facing page for a payment link created in the admin. */
export default async function PaymentLinkPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  let order = await getOrder(ref).catch(() => null);
  if (!order) notFound();
  // Catch payments whose redirect back was missed.
  if (order.status !== "paid" && order.payRef) order = (await confirmPayment(order.payRef).catch(() => null)) ?? order;
  const paid = order.status === "paid";
  const expired = linkExpired(order);
  const total = money(order.total, order.currency);
  const first = order.customer.name.split(" ")[0];

  return (
    <section className="container max-w-xl py-10 sm:py-14">
      <article className="card overflow-hidden p-0">
        <header className="bg-brand-900 px-6 py-6 text-white sm:px-8">
          <p className="text-sm text-white/70">Payment request from</p>
          <p className="text-2xl font-bold text-lime-400">{site.name}</p>
          <p className="mt-1 text-xs text-white/60">{site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""}</p>
        </header>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          {paid ? (
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Payment received. Thank you, {first}!</p>
                <p className="mt-0.5 text-sm">We received {total} on {dateStr(order.paidAt)}. Your receipt is ready below.</p>
              </div>
            </div>
          ) : expired ? (
            <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div>
                <p className="font-semibold">This payment link has expired</p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                  It expired on {dateStr(order.link?.expiresAt)}. Please <Link href="/contact" className="font-medium underline">contact us</Link> for a new link.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500">Hello {first},</p>
              <p className="mt-1 text-lg font-semibold">You have a payment request of {total}</p>
              {order.link?.message && <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">{order.link.message}</p>}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice {order.invoiceNumber}</p>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
              {order.items.map((l) => (
                <li key={l.id} className="flex items-start gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 ring-1 ring-slate-200 dark:bg-white" dangerouslySetInnerHTML={{ __html: logoSvg(l.logo in LOGOS ? l.logo : "other", { size: 20 }) }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.name}{l.subtitle ? <span className="text-slate-500"> ({l.subtitle})</span> : null}</p>
                    <p className="text-xs text-slate-500">{l.period}{l.purpose && !l.purpose.startsWith("Payment requested by") ? ` · ${l.purpose}` : ""}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{money(l.amount, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between rounded-2xl bg-brand-900 px-5 py-4 text-white">
              <span className="text-sm font-semibold text-lime-400">{paid ? "TOTAL PAID" : "TOTAL"}</span>
              <span className="text-xl font-bold tabular-nums">{total}</span>
            </div>
          </div>

          {!paid && !expired && (
            <div className="space-y-3">
              <a href={`/checkout/pay/${order.ref}`} className="btn btn-primary btn-lg w-full">
                <Lock className="h-4 w-4" /> Pay {total} with Paystack
              </a>
              <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/paystack.svg" alt="" width={14} height={14} className="h-3.5 w-3.5" />
                Card, bank transfer or USSD. Secured by Paystack.
              </p>
              {order.link?.expiresAt && <p className="text-center text-xs text-slate-500">This link expires on {dateStr(order.link.expiresAt)}.</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-white/10">
            <Link href={`/checkout/invoice/${order.ref}`} className="btn btn-outline btn-sm"><FileText className="h-4 w-4" /> View invoice</Link>
            <a href={`/checkout/invoice/${order.ref}/pdf?doc=invoice`} className="btn btn-outline btn-sm"><Download className="h-4 w-4" /> Invoice PDF</a>
            {paid && <a href={`/checkout/invoice/${order.ref}/pdf?doc=receipt`} className="btn btn-dark btn-sm"><Download className="h-4 w-4" /> Receipt PDF</a>}
          </div>
        </div>
      </article>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-lime-400" />
        <p>
          Genuine {site.name} payment links start with <strong>{site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}/checkout/</strong>. We never ask for your card PIN, OTP or password.
          Questions? Email <a className="underline" href={`mailto:${site.email}`}>{site.email}</a> or call {site.phone}. <Link className="underline" href="/faq#payment-links">Payment link FAQs</Link>
        </p>
      </div>
    </section>
  );
}
