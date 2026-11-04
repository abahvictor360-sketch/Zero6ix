import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BookOpen, CreditCard, Globe2, GraduationCap, Laptop, Lock, Megaphone,
  Building2, Package, PlaneTakeoff, Plane, Scale, ShieldCheck, Sparkles, Timer, Users,
} from "lucide-react";
import { RateWidget } from "@/components/site/rate-widget";
import type { Metadata } from "next";
import { FaqList } from "@/components/site/faq-list";
import { pageMeta } from "@/lib/seo";
import { getFeeSettings, getPublicRates } from "@/lib/settings";
import { HOME_FAQS, ITEM_STORES, SERVICE_CATEGORIES, STEPS } from "@/lib/content";
import { formatMoney } from "@/lib/format";
import { accountsEnabled, requestCta, site } from "@/lib/site";

const WHO = [
  { icon: GraduationCap, t: "Students & applicants", d: "Exam, application, evaluation and visa fees: IELTS, TOEFL, WES, UCAS, SEVIS and more." },
  { icon: Users, t: "Freelancers & creatives", d: "Software, subscriptions, ad credits and tools when your card is declined or your region isn't supported." },
  { icon: Plane, t: "Africans in the diaspora", d: "Living abroad but paying with Naira or another African currency? We bridge the gap for you and your family." },
  { icon: Building2, t: "Businesses & organisations", d: "SMEs, schools, NGOs and startups paying for team tools in bulk, with proper invoices and statements." },
];

const CATEGORY_ICONS = { software: Laptop, exams: GraduationCap, visa: PlaneTakeoff, web: Globe2, learning: BookOpen, ads: Megaphone } as const;

export const metadata: Metadata = pageMeta({
  title: "Web Purchase | Pay foreign websites in Naira",
  description: "Pay subscriptions, IELTS, WES and visa fees, ads and Amazon orders from Nigeria or abroad. We pay in USD, GBP or EUR; you pay in Naira or local currency.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const [rates, fees] = await Promise.all([getPublicRates(), getFeeSettings()]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900 text-white dark:bg-[#06140f]">
        <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="container relative grid items-center gap-12 pb-20 pt-14 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <Link href="/legal/prohibited-items" className="inline-flex items-center gap-2 rounded-full border border-lime-400/40 bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-300">
              <span className="shrink-0 whitespace-nowrap rounded-full bg-lime-400 px-2 py-0.5 text-[11px] font-bold uppercase text-brand-950">Legal only</span>
              Every request reviewed by a human <ArrowRight className="h-3 w-3" />
            </Link>
            <h1 className="h1 mt-6 max-w-2xl">
              Pay for anything online, <span className="text-lime-400">in any currency.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Card declined? Currency limits? Region not supported? Whether you&apos;re in Nigeria or abroad, we pay for your
              subscriptions, exam and visa fees and buy from foreign stores in USD, GBP, EUR and more. You pay us in Naira
              or your local African currency.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link {...requestCta("service")} className="btn btn-primary btn-lg">
                Request a Payment <ArrowRight className="h-4 w-4" />
              </Link>
              <Link {...requestCta("item")} className="btn btn-ghost-light btn-lg">
                Buy an Item <Package className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-10 grid max-w-xl grid-cols-2 gap-4 text-sm text-white/75 sm:grid-cols-4">
              <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-lime-400" /> Secure checkout</li>
              <li className="flex items-center gap-2"><Timer className="h-4 w-4 text-lime-400" /> Same-day service</li>
              <li className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-lime-400" /> Pay in ₦ or African currency</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-lime-400" /> No hidden fees</li>
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-6 -top-6 hidden rotate-[-6deg] rounded-2xl bg-lime-400 px-4 py-3 text-brand-950 shadow-xl sm:block">
              <p className="text-xs font-medium">Canva Pro · paid</p>
              <p className="text-lg font-bold">$119.99 ✓</p>
            </div>
            <RateWidget initial={rates} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#071a13]">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments by Paystack & Flutterwave</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Encrypted credentials</span>
          <span className="flex items-center gap-2"><Scale className="h-4 w-4" /> Legal requests only</span>
          <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> Verified accounts (KYC)</span>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="h2 mt-4">Four simple steps. Zero bank stress.</h2>
          <p className="muted mt-4">
            {site.name} is a pay-for-me and shop-and-ship service run by {site.company} in Port Harcourt, Nigeria. We pay foreign
            websites in USD, GBP, EUR and more on your behalf, and you pay us in Naira or your local African currency.
          </p>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-400 text-lg font-bold text-brand-950">{i + 1}</span>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="muted mt-2 text-sm leading-6">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Two offerings */}
      <section className="container grid gap-5 pb-20 md:grid-cols-2">
        <div className="card-dark flex flex-col p-8">
          <h3 className="text-center text-2xl font-semibold text-lime-400">For services</h3>
          <p className="mx-auto mt-3 max-w-sm text-center text-white/75">Subscriptions, exam fees, visa fees, domains, courses and ad credits, paid the same day.</p>
          <Link href="/services" className="btn btn-primary btn-sm mx-auto mt-5">Explore services <ArrowRight className="h-3.5 w-3.5" /></Link>
          <div className="mt-8 grid grid-cols-2 gap-2 text-sm">
            {["ChatGPT Plus", "IELTS fee", "Adobe CC", "UK visa IHS", "Figma", "Coursera"].map((s) => (
              <span key={s} className="rounded-xl bg-white/10 px-3 py-2">{s}</span>
            ))}
          </div>
        </div>
        <div className="card-dark flex flex-col p-8">
          <h3 className="text-center text-2xl font-semibold text-lime-400">For items</h3>
          <p className="mx-auto mt-3 max-w-sm text-center text-white/75">We buy from foreign stores, receive at our hubs abroad and ship to your door with tracking.</p>
          <Link href="/shop-and-ship" className="btn btn-primary btn-sm mx-auto mt-5">How Shop & Ship works <ArrowRight className="h-3.5 w-3.5" /></Link>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            {ITEM_STORES.slice(0, 8).map((s) => <span key={s} className="rounded-full bg-white/10 px-3 py-1.5">{s}</span>)}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-slate-50 py-20 dark:bg-white/[0.02]">
        <div className="container">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">What we pay for</p>
              <h2 className="h2 mt-4 max-w-xl">Popular service categories</h2>
            </div>
            <Link href="/services" className="btn btn-outline">See all services <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.slug as keyof typeof CATEGORY_ICONS];
              return (
                <Link key={c.slug} href={`/services/${c.slug}`} className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-400/25 text-brand-700 ring-1 ring-lime-400 dark:text-lime-300"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-semibold">{c.title}</h3>
                  <p className="muted mt-2 text-sm">{c.examples.slice(0, 4).join(" · ")}</p>
                  <p className="mt-4 flex items-center justify-between text-xs font-medium text-brand-700 dark:text-lime-400">{c.turnaround} <ArrowRight className="h-3.5 w-3.5" /></p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why us + fees */}
      <section className="container grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Why Web Purchase?</p>
          <h2 className="h2 mt-4">Transparent pricing you can check before you pay</h2>
          <p className="muted mt-4 text-lg">One simple fee: <strong className="text-slate-900 dark:text-white">{fees.percentage_fee}% + {formatMoney(fees.flat_fee_ngn)}</strong> (minimum {formatMoney(fees.minimum_fee_ngn)}). The exchange rate is shown on every quote and locked for {fees.quote_validity_hours} hours.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/pricing" className="btn btn-dark">Try the fee calculator</Link>
            <Link href="/legal/prohibited-items" className="btn btn-outline">What we can&apos;t buy</Link>
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Timer, t: "Fast, reliable payments", d: "Most service payments done the same day." },
            { icon: Globe2, t: "Global coverage", d: "We pay vendors in USD, GBP, EUR, CAD, AED, CNY and more. You pay in Naira or another African currency." },
            { icon: Sparkles, t: "Human support", d: "Real people by phone, email and our contact form." },
            { icon: ShieldCheck, t: "Secure & compliant", d: "KYC, encrypted data, audited operations." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="card p-5">
              <Icon className="h-6 w-6 text-brand-600 dark:text-lime-400" />
              <p className="mt-3 font-semibold">{t}</p>
              <p className="muted mt-1 text-sm">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Who we serve */}
      <section className="bg-brand-900 py-20 text-white dark:bg-[#071a13]">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow !text-lime-300">Who we serve</p>
            <h2 className="h2 mt-4">Built for Africans, at home and abroad</h2>
            <p className="mt-4 text-white/70">You pay in Naira or your local African currency. We pay the vendor in USD, GBP, EUR and more.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {WHO.map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-400 text-brand-950"><Icon className="h-5 w-5" /></span>
                <p className="mt-5 font-semibold">{t}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container grid gap-10 py-20 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="eyebrow">FAQs</p>
          <h2 className="h2 mt-4">Questions? Answers.</h2>
          <p className="muted mt-4">Can&apos;t find what you need? <Link href="/contact" className="font-semibold text-brand-700 underline dark:text-lime-400">Contact us</Link> or call us on {site.phone}.</p>
        </div>
        <FaqList items={HOME_FAQS} />
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-4xl bg-lime-400 px-6 py-14 text-center text-brand-950 sm:px-12">
          <h2 className="h2">Ready when you are.</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-900/80">{accountsEnabled ? "Create a free account in a minute. Submit your first request and get a Naira quote today." : "Tell us what you need and get a quote in Naira or your local African currency today."}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link {...requestCta("service")} className="btn btn-dark btn-lg">Request a Payment</Link>
            <Link {...requestCta("item")} className="btn btn-lg border border-brand-900/30 hover:bg-brand-900/10">Buy an Item</Link>
          </div>
        </div>
      </section>
    </>
  );
}
