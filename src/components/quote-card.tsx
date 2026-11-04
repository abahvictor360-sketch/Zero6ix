import Link from "next/link";
import { Lock, TimerOff } from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function QuoteBreakdown({ quote }: { quote: Quote }) {
  const rows: [string, string][] = [
    [`${quote.currency} ${formatNumber(Number(quote.foreign_amount))} × ₦${formatNumber(Number(quote.exchange_rate))}`, formatMoney(quote.subtotal_ngn)],
    ["Service fee", formatMoney(quote.service_fee_ngn)],
  ];
  if (Number(quote.shipping_fee_ngn) > 0) rows.push(["International shipping", formatMoney(quote.shipping_fee_ngn)]);
  if (Number(quote.other_fees_ngn) > 0) rows.push(["Other fees", formatMoney(quote.other_fees_ngn)]);
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4"><dt className="text-white/70">{k}</dt><dd className="tabular-nums">{v}</dd></div>
      ))}
      <div className="flex items-end justify-between border-t border-white/15 pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="text-2xl font-bold text-lime-400 tabular-nums">{formatMoney(quote.total_ngn)}</dd>
      </div>
    </dl>
  );
}

export function QuoteCard({ quote, canPay }: { quote: Quote; canPay: boolean }) {
  const expired = quote.status === "expired" || (quote.status === "active" && new Date(quote.expires_at) < new Date());
  return (
    <section className="card-dark">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Your quote</h2>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs capitalize">{expired ? "expired" : quote.status}</span>
      </div>
      <QuoteBreakdown quote={quote} />
      {quote.notes && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-white/80">{quote.notes}</p>}
      {quote.status === "active" && !expired && (
        <>
          <p className="mt-4 flex items-center gap-2 text-xs text-white/70"><Lock className="h-3.5 w-3.5" /> Rate locked until {formatDate(quote.expires_at, true)}</p>
          {canPay && <Link href={`/pay/${quote.payment_token}`} className="btn btn-primary mt-4 w-full">Pay {formatMoney(quote.total_ngn)}</Link>}
        </>
      )}
      {expired && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-400/15 p-3 text-sm text-amber-200">
          <TimerOff className="mt-0.5 h-4 w-4 shrink-0" /> This quote expired on {formatDate(quote.expires_at, true)}. Send us a message below and we&apos;ll re-issue it at today&apos;s rate.
        </p>
      )}
    </section>
  );
}
