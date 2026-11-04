"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { computeQuote } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { requestCta } from "@/lib/site";
import type { ExchangeRate, FeeSettings, ShippingRate } from "@/lib/types";

export function FeeCalculator({ rates, fees, shipping }: { rates: ExchangeRate[]; fees: FeeSettings; shipping: ShippingRate[] }) {
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState(rates[0]?.currency ?? "USD");
  const [isItem, setIsItem] = useState(false);
  const [weight, setWeight] = useState("1");
  const [origin, setOrigin] = useState(shipping[0]?.origin_region ?? "US");

  const result = useMemo(() => {
    const rate = rates.find((r) => r.currency === currency);
    const usd = rates.find((r) => r.currency === "USD");
    const ship = shipping.find((s) => s.origin_region === origin);
    const n = Number(amount);
    if (!rate || !(n > 0)) return null;
    try {
      return computeQuote({
        amount: n,
        currency,
        sellRate: rate.sell_rate,
        fees,
        shipping: isItem && ship && usd ? { weightKg: Number(weight) || 0, rate: ship, usdSellRate: usd.sell_rate } : null,
      });
    } catch {
      return null;
    }
  }, [amount, currency, isItem, weight, origin, rates, fees, shipping]);

  return (
    <div className="card grid gap-6 p-6 md:grid-cols-2 md:p-8">
      <div className="space-y-4">
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm dark:bg-white/10" role="tablist">
          {[["Service payment", false], ["Item + shipping", true]].map(([label, v]) => (
            <button key={String(label)} role="tab" aria-selected={isItem === v} onClick={() => setIsItem(v as boolean)}
              className={`rounded-full px-4 py-1.5 font-medium ${isItem === v ? "bg-white shadow dark:bg-brand-800" : "text-slate-500"}`}>
              {label as string}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="label" htmlFor="calc-amount">Amount</label>
            <input id="calc-amount" className="input text-lg font-semibold" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
          <div>
            <label className="label" htmlFor="calc-currency">Currency</label>
            <select id="calc-currency" className="input text-lg font-semibold" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {rates.map((r) => <option key={r.currency}>{r.currency}</option>)}
            </select>
          </div>
        </div>
        {isItem && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="calc-origin">Shipping from</label>
              <select id="calc-origin" className="input" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {shipping.map((s) => <option key={s.origin_region} value={s.origin_region}>{s.label.split(" →")[0]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="calc-weight">Weight (kg)</label>
              <input id="calc-weight" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} />
            </div>
          </div>
        )}
        <p className="hint">Estimates use today&apos;s rate. Your final quote locks the rate for {fees.quote_validity_hours} hours.</p>
      </div>

      <div className="rounded-3xl bg-brand-900 p-6 text-white dark:bg-brand-950 dark:ring-1 dark:ring-white/10">
        {result ? (
          <dl className="space-y-3 text-sm">
            <Row label={`Exchange rate`} value={`₦${result.exchangeRate.toLocaleString("en-NG")} / ${currency}`} />
            <Row label="Amount in Naira" value={formatMoney(result.subtotalNgn)} />
            <Row label={`Service fee (${result.serviceFeeRule})`} value={formatMoney(result.serviceFeeNgn)} />
            {isItem && <Row label="International shipping" value={formatMoney(result.shippingFeeNgn)} />}
            <div className="border-t border-white/15 pt-3">
              <Row label={<span className="text-base font-semibold text-white">Estimated total</span>} value={<span className="text-2xl font-bold text-lime-400">{formatMoney(result.totalNgn)}</span>} />
            </div>
          </dl>
        ) : (
          <p className="text-white/70">Enter an amount to see your estimate.</p>
        )}
        <Link {...requestCta("quote", result ? `${amount} ${currency}${isItem ? `, ${weight}kg from ${origin}` : ""}` : undefined)} className="btn btn-primary mt-6 w-full">
          Get an exact quote
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-white/70">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}
