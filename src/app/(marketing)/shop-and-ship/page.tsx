import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Box, ClipboardCheck, Home, Link2, Plane, ShoppingBag, Warehouse } from "lucide-react";
import { getShippingRates } from "@/lib/settings";
import { ITEM_STORES } from "@/lib/content";
import { formatNumber } from "@/lib/format";
import { requestCta } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shop & Ship",
  description: "Buy from Amazon, eBay, AliExpress, Walmart and more. We purchase, receive and ship to your door in Nigeria with tracking.",
};

const FLOW = [
  { icon: Link2, t: "Send product links", d: "Paste one or more links with size, colour and quantity." },
  { icon: ClipboardCheck, t: "Get an all-in quote", d: "Item price, our fee and estimated shipping, in Naira or your local currency." },
  { icon: ShoppingBag, t: "We buy it", d: "We order from the store using our foreign accounts." },
  { icon: Warehouse, t: "Received abroad", d: "Your item arrives at our hub, gets weighed and inspected." },
  { icon: Plane, t: "Shipped to Nigeria", d: "Air freight with tracking number and customs clearance." },
  { icon: Home, t: "Delivered", d: "Door delivery nationwide or pickup at our Port Harcourt office." },
];

export default async function ShopAndShipPage() {
  const rates = await getShippingRates();
  return (
    <>
      <section className="bg-brand-900 py-16 text-white dark:bg-[#06140f]">
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow !text-lime-300">Shop & Ship</p>
            <h1 className="h1 mt-4">Shop the world. Delivered to Nigeria.</h1>
            <p className="mt-4 text-lg text-white/75">Electronics, books, fashion, spare parts and gadgets from stores that don&apos;t ship to Nigeria or won&apos;t take your card.</p>
            <Link {...requestCta("item")} className="btn btn-primary btn-lg mt-8">Buy an Item <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {ITEM_STORES.map((s) => <span key={s} className="rounded-full bg-white/10 px-4 py-2 text-sm">{s}</span>)}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="h2 text-center">How buying and shipping works</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="card">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-lime-400 text-brand-950"><Icon className="h-5 w-5" /></span>
                <span className="text-xs font-semibold text-slate-400">STEP {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="muted mt-1 text-sm">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-slate-50 py-16 dark:bg-white/[0.02]">
        <div className="container">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="h2">Shipping fees & delivery timelines</h2>
              <p className="muted mt-2">Billed per started 0.5kg of actual or volumetric weight (whichever is higher), converted at the USD rate on your quote.</p>
            </div>
            <Link href="/pricing" className="btn btn-outline">Estimate my total</Link>
          </div>
          <div className="card mt-8 overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr><th>Route</th><th>Rate per kg</th><th>Minimum charge</th><th>Delivery time</th></tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.origin_region}>
                    <td className="font-medium">{r.label}</td>
                    <td>${formatNumber(r.rate_per_kg_usd)}</td>
                    <td>${formatNumber(r.min_charge_usd)}</td>
                    <td>{r.delivery_days_min}–{r.delivery_days_max} working days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Customs & duties", "Duties for regular personal items are included in the shipping rate. Commercial quantities may attract extra duty. We'll tell you before you pay."],
              ["Inspection & photos", "We inspect items at our hub and can send photos on request before shipping."],
              ["Consolidation", "Multiple orders from the same country can be combined to save on shipping."],
            ].map(([t, d]) => (
              <div key={t} className="card p-5">
                <Box className="h-5 w-5 text-brand-600 dark:text-lime-400" />
                <p className="mt-3 font-semibold">{t}</p>
                <p className="muted mt-1 text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
