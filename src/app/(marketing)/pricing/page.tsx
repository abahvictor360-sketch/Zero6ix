import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { FeeCalculator } from "@/components/site/fee-calculator";
import { getFeeSettings, getPublicRates, getShippingRates } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = pageMeta({
  title: "Pricing & fee calculator (5% + ₦1,000)",
  description: "Web Purchase fees: 5% of the Naira amount + ₦1,000 (minimum ₦2,500), no hidden charges. See today's USD, GBP, EUR, CAD rates and calculate your total in Naira.",
  path: "/pricing",
});

export default async function PricingPage() {
  const [rates, fees, shipping] = await Promise.all([getPublicRates(), getFeeSettings(), getShippingRates()]);
  return (
    <>
      <section className="bg-brand-900 py-16 text-white dark:bg-[#06140f]">
        <div className="container max-w-3xl text-center">
          <p className="eyebrow !text-lime-300">Pricing</p>
          <h1 className="h1 mt-4">Simple, honest pricing</h1>
          <p className="mt-4 text-lg text-white/75">
            {fees.percentage_fee}% + {formatMoney(fees.flat_fee_ngn)} per order (minimum {formatMoney(fees.minimum_fee_ngn)}). No hidden charges.
          </p>
        </div>
      </section>

      <section className="container -mt-8 pb-16">
        <FeeCalculator rates={rates} fees={fees} shipping={shipping} />
      </section>

      <section className="container grid gap-8 pb-20 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-semibold">Fee structure</h2>
          <dl className="mt-5 divide-y divide-slate-100 text-sm dark:divide-white/10">
            {[
              ["Service fee", `${fees.percentage_fee}% of the Naira amount`],
              ["Flat fee", formatMoney(fees.flat_fee_ngn)],
              ["Minimum fee", formatMoney(fees.minimum_fee_ngn)],
              ["Shipping (items only)", "Per kg by origin (see Shop & Ship)"],
              ["Payment processing", "Included, no card surcharge"],
              ["Quote validity", `${fees.quote_validity_hours} hours (rate locked)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3"><dt className="muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold">How our exchange rate works</h2>
          <div className="muted mt-4 space-y-3 text-sm leading-6">
            <p>We buy foreign currency from licensed sources and publish a single <strong>sell rate</strong> per currency. It&apos;s updated several times a day to track the market.</p>
            <p>When we send your quote, the rate is <strong>locked for {fees.quote_validity_hours} hours</strong>. If the market moves, your price doesn&apos;t. After that, the quote expires and we re-issue it at the current rate.</p>
            <p>You always see the exact rate on your quote, invoice and receipt.</p>
          </div>
          <table className="table mt-5">
            <thead><tr><th>Currency</th><th className="text-right">Our rate (₦)</th></tr></thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.currency}><td>{r.symbol} {r.name} ({r.currency})</td><td className="text-right tabular-nums">{r.sell_rate.toLocaleString("en-NG")}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="hint mt-3">
            {rates[0]?.source === "fallback"
              ? "Indicative rates. Live rates are temporarily unavailable; your quote will use the current rate."
              : `Our rates, based on market rates updated ${formatDate(rates[0]?.updated_at, true)}. Your quote locks the exact rate.`}
          </p>
        </div>
      </section>
      <JsonLd data={breadcrumbSchema([{ name: "Pricing", path: "/pricing" }])} />
    </>
  );
}
