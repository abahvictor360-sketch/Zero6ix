import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { Eye, HeartHandshake, Scale, ShieldCheck } from "lucide-react";
import { accountsEnabled, requestCta, site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "About us: Zero6ix Limited, Port Harcourt",
  description: "Web Purchase is a pay-for-me and shop-and-ship service by Zero6ix Limited (RC 8922251), Port Harcourt, helping Africans pay foreign websites in Naira.",
  path: "/about",
});

const VALUES = [
  { icon: Eye, t: "Transparency", d: "Every quote shows the exchange rate, our fee and shipping. No surprises." },
  { icon: Scale, t: "Compliance first", d: "Every request is reviewed by a person. We only handle legal goods and services." },
  { icon: ShieldCheck, t: "Security", d: "Payments via licensed gateways, encrypted credentials, verified accounts and audit trails." },
  { icon: HeartHandshake, t: "Real support", d: "Talk to real people by phone, email or our contact form, not an endless bot loop." },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-brand-900 py-16 text-white dark:bg-[#06140f]">
        <div className="container max-w-3xl">
          <p className="eyebrow !text-lime-300">About {site.name}</p>
          <h1 className="h1 mt-4">Opening the global internet to every African, wherever they are.</h1>
          <p className="mt-5 text-lg text-white/75">
            Millions of Nigerians and Africans, at home and in the diaspora, can&apos;t pay for the tools, exams and products they need online. Not because they
            can&apos;t afford them, but because cards get declined, FX limits bite, or their region isn&apos;t supported.
            We fix that.
          </p>
        </div>
      </section>
      <section className="container grid gap-10 py-16 lg:grid-cols-2">
        <div className="muted space-y-4 text-lg leading-8">
          <p>
            {site.name} is a Port Harcourt-based &quot;pay-for-me&quot; and shop-and-ship service. Students use us for exam and application fees,
            freelancers for software and ad credits, and organisations (schools, NGOs and SMEs) to pay for team tools in bulk with
            proper invoices and monthly statements.
          </p>
          <p>
            You tell us what you need, we send you a clear quote in Naira or your local African currency, you pay securely, and we pay the vendor in their currency.
            For physical items, we buy, receive at our hubs abroad and ship to your door with tracking.
          </p>
          <Link {...requestCta("service")} className="btn btn-dark">{accountsEnabled ? "Create a free account" : "Contact us"}</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, t, d }) => (
            <div key={t} className="card p-5">
              <Icon className="h-6 w-6 text-brand-600 dark:text-lime-400" />
              <p className="mt-3 font-semibold">{t}</p>
              <p className="muted mt-1 text-sm">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="container pb-16">
        <div className="card">
          <h2 className="text-xl font-semibold">{site.name} at a glance</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {[
              ["Operated by", `${site.company}${site.rcNumber ? ` (${site.rcNumber})` : ""}`],
              ["Head office", site.address],
              ["What we do", "Pay foreign websites on your behalf (subscriptions, exam, visa and application fees, domains, ads) and buy and ship items from abroad"],
              ["Who we serve", "Nigerians and Africans at home and in the diaspora, plus SMEs, schools, NGOs and startups"],
              ["Currencies we pay in", "USD, GBP, EUR, CAD, AUD, AED, CNY and more"],
              ["How you pay", "Naira or your local African currency, by card, bank transfer or USSD via Paystack or Flutterwave"],
              ["Fees", "5% of the Naira amount + ₦1,000 (minimum ₦2,500); shipping extra for items"],
              ["Contact", `${site.phone} · ${site.email}`],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-slate-100 pb-3 dark:border-white/10">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <JsonLd data={breadcrumbSchema([{ name: "About", path: "/about" }])} />
    </>
  );
}
