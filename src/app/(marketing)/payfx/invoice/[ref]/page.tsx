import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Download } from "lucide-react";
import { getOrder } from "@/lib/payfx/store";
import { confirmPayment } from "@/lib/payfx/orders";
import { gatewayName, money } from "@/lib/payfx/catalog";
import { logoSvg } from "@/lib/payfx/icons";
import { site } from "@/lib/site";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dateStr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "-");

export default async function PayfxInvoicePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  let order = await getOrder(ref).catch(() => null);
  if (!order) notFound();
  // If the customer paid but the redirect was missed, confirm now.
  if (order.status !== "paid" && order.payRef) order = (await confirmPayment(order.payRef).catch(() => null)) ?? order;
  const paid = order.status === "paid";
  const rate = order.rate || 1365;

  return (
    <section className="container max-w-4xl py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/payfx" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> PayFX</Link>
        <div className="flex flex-wrap gap-2">
          {!paid && <a href={`/payfx/pay/${order.ref}`} className="btn btn-dark btn-sm">Pay now</a>}
          <PrintButton />
          <a href={`/payfx/invoice/${order.ref}/pdf`} className="btn btn-outline btn-sm"><Download className="h-4 w-4" /> Download PDF</a>
        </div>
      </div>

      {!paid && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 print:hidden">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" /> Payment has not been confirmed for this invoice yet. If you have just paid, refresh in a moment.
        </p>
      )}

      <article className="card overflow-hidden p-0 print:shadow-none print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-4 bg-brand-900 px-6 py-6 text-white sm:px-8">
          <div>
            <p className="text-2xl font-bold text-lime-400">{site.name}</p>
            <p className="mt-1 text-sm text-white/70">{site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-wide">INVOICE</p>
            <p className="mt-1 text-sm text-white/70">{order.invoiceNumber}</p>
          </div>
        </header>

        <div className="space-y-8 px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billed to</p>
              {order.customer.company && <p className="mt-1 font-semibold">{order.customer.company}</p>}
              <p className={order.customer.company ? "" : "mt-1 font-semibold"}>{order.customer.name}</p>
              <p className="text-sm text-slate-500">{order.customer.email}</p>
              {order.customer.phone && <p className="text-sm text-slate-500">{order.customer.phone}</p>}
            </div>
            <div className="text-sm">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${paid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                {paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />} {paid ? "PAID" : "UNPAID"}
              </span>
              <dl className="mt-3 space-y-1 text-slate-600 dark:text-slate-300">
                <div><dt className="inline text-slate-500">Issued: </dt><dd className="inline">{dateStr(order.createdAt)}</dd></div>
                <div><dt className="inline text-slate-500">Payment: </dt><dd className="inline">{gatewayName(order.gateway)}{order.channel ? ` (${order.channel})` : ""}</dd></div>
                {paid && <div><dt className="inline text-slate-500">Paid: </dt><dd className="inline">{dateStr(order.paidAt)}</dd></div>}
                {order.transactionId && <div><dt className="inline text-slate-500">Transaction ID: </dt><dd className="inline font-mono text-xs">{order.transactionId}</dd></div>}
              </dl>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-white/10">
                  <th className="py-2 pr-3">Item</th><th className="hidden py-2 pr-3 sm:table-cell">Period</th><th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 align-top dark:border-white/5">
                    <td className="py-3 pr-3">
                      <div className="flex gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-900 ring-1 ring-slate-200 dark:bg-white" dangerouslySetInnerHTML={{ __html: logoSvg(l.logo, { size: 20 }) }} />
                        <div>
                          <p className="font-semibold">{l.name}{l.subtitle ? <span className="font-normal text-slate-500"> ({l.subtitle})</span> : null}</p>
                          <p className="text-xs text-slate-500">{l.purpose}</p>
                          <p className="text-xs text-slate-500 sm:hidden">{l.period}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-3 pr-3 sm:table-cell">{l.period}</td>
                    <td className="whitespace-nowrap py-3 text-right font-medium tabular-nums">{money(l.amount, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-sm">
            <div className="flex items-baseline justify-between rounded-2xl bg-brand-900 px-5 py-4 text-white">
              <span className="text-sm font-semibold text-lime-400">{paid ? "TOTAL PAID" : "TOTAL DUE"}</span>
              <span className="text-xl font-bold tabular-nums">{money(order.total, order.currency)}</span>
            </div>
            <p className="mt-2 text-right text-xs text-slate-500">
              {order.currency === "NGN"
                ? `Approx. ${money(order.total / rate, "USD")} at US$1 = ${money(rate, "NGN")}`
                : `Charged in ${order.currency} at US$1 = ${money(rate, "NGN")} (${money(order.ngnTotal, "NGN")})`}
            </p>
          </div>
        </div>

        <footer className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500 dark:border-white/10 sm:px-8">
          {site.name}, a service of {site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""}. {site.address}. {site.email} · {site.phone}
        </footer>
      </article>
    </section>
  );
}
