import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CheckCircle2, Lock, ShieldCheck, TimerOff } from "lucide-react";
import { getQuoteByToken } from "@/lib/payments/service";
import { isServiceRoleConfigured } from "@/lib/env";
import { QuoteBreakdown } from "@/components/quote-card";
import { Alert } from "@/components/ui";
import { Countdown, PayForm } from "./pay-form";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Secure payment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isServiceRoleConfigured()) notFound();
  const pq = await getQuoteByToken(token);
  if (!pq) notFound();
  const { quote, request, state, kycRequired } = pq;

  return (
    <section className="container grid max-w-5xl gap-8 py-12 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="eyebrow">Order {request.reference}</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{request.title}</h1>
        <p className="muted mt-2 text-sm">{request.type === "item" ? "Item purchase & shipping" : "Service payment"} · quoted {formatDate(quote.created_at, true)}</p>
        <div className="card-dark mt-6"><QuoteBreakdown quote={quote} /></div>
        <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-brand-600 dark:text-lime-400" /> 256-bit encrypted checkout by licensed gateways</li>
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600 dark:text-lime-400" /> Full refund if we can&apos;t complete your order</li>
          <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand-600 dark:text-lime-400" /> Invoice & receipt emailed instantly</li>
        </ul>
      </div>

      <div className="card self-start">
        {state === "paid" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-3 text-xl font-semibold">This quote has been paid</h2>
            <p className="muted mt-1 text-sm">Thank you! Track progress in your dashboard.</p>
            <Link href={`/dashboard/requests/${request.id}`} className="btn btn-dark mt-5">View order</Link>
          </div>
        )}
        {state === "expired" && (
          <div className="text-center">
            <TimerOff className="mx-auto h-12 w-12 text-amber-500" />
            <h2 className="mt-3 text-xl font-semibold">This quote has expired</h2>
            <p className="muted mt-1 text-sm">Quotes lock the exchange rate for a limited time. Message us and we&apos;ll re-issue it at today&apos;s rate.</p>
            <Link href={`/dashboard/requests/${request.id}#messages`} className="btn btn-dark mt-5">Request a new quote</Link>
          </div>
        )}
        {state === "unavailable" && <Alert tone="warning">This payment link is no longer active. Please check your dashboard for the latest quote.</Alert>}
        {state === "payable" && (
          <>
            <h2 className="text-xl font-semibold">Complete payment</h2>
            <p className="muted mb-1 mt-1 text-sm">Amount due</p>
            <p className="text-3xl font-bold">{formatMoney(quote.total_ngn)}</p>
            <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-400">Rate locked for <Countdown until={quote.expires_at} /></p>
            {kycRequired ? (
              <Alert tone="warning">
                Orders of this size need a verified ID before payment. <Link href="/dashboard/profile#kyc" className="font-semibold underline">Upload your ID</Link> — we usually review within a few hours.
              </Alert>
            ) : (
              <PayForm token={token} total={formatMoney(quote.total_ngn)} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
