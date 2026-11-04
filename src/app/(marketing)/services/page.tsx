import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Globe2, GraduationCap, Laptop, Megaphone, PlaneTakeoff } from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/content";
import { getFeeSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { requestCta } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbSchema, pageMeta, serviceSchema } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Pay subscriptions, exam, visa & ad fees",
  description: "We pay ChatGPT, Canva, Adobe, IELTS, WES, UCAS, UK visa/IHS, SEVIS, domains, hosting, courses and ads in USD, GBP or EUR. You pay in Naira or local currency.",
  path: "/services",
});

const ICONS = { software: Laptop, exams: GraduationCap, visa: PlaneTakeoff, web: Globe2, learning: BookOpen, ads: Megaphone } as const;

export default async function ServicesPage() {
  const fees = await getFeeSettings();
  return (
    <>
      <section className="bg-brand-900 py-16 text-white dark:bg-[#06140f]">
        <div className="container max-w-3xl text-center">
          <p className="eyebrow !text-lime-300">Services</p>
          <h1 className="h1 mt-4">We pay for it. You pay us in Naira or your local currency.</h1>
          <p className="mt-4 text-lg text-white/75">If it&apos;s legal and sold online, we can pay for it, usually the same day.</p>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {SERVICE_CATEGORIES.map((c) => {
            const Icon = ICONS[c.slug as keyof typeof ICONS];
            return (
              <article key={c.slug} id={c.slug} className="card scroll-mt-24">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-900 text-lime-400"><Icon className="h-6 w-6" /></span>
                  <div>
                    <h2 className="text-xl font-semibold"><Link href={`/services/${c.slug}`} className="hover:underline">{c.title}</Link></h2>
                    <p className="muted mt-1 text-sm">Typical fee: {c.typicalFee} · Turnaround: {c.turnaround}</p>
                  </div>
                </div>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {c.examples.map((e) => (
                    <li key={e} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-brand-600 dark:text-lime-400" /> {e}</li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link {...requestCta("service", c.title)} className="btn btn-dark btn-sm">
                    Request this <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link href={`/services/${c.slug}`} className="btn btn-outline btn-sm">Learn more</Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="card mt-10 grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Service fee</p>
            <p className="mt-1 text-2xl font-bold">{fees.percentage_fee}% + {formatMoney(fees.flat_fee_ngn)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Minimum fee</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(fees.minimum_fee_ngn)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Rate lock</p>
            <p className="mt-1 text-2xl font-bold">{fees.quote_validity_hours} hours</p>
          </div>
          <p className="muted text-sm md:col-span-3">
            Example: a $20 subscription at ₦1,590/$ = ₦31,800 + fee {formatMoney(Math.max(31800 * fees.percentage_fee / 100 + fees.flat_fee_ngn, fees.minimum_fee_ngn))}.{" "}
            <Link href="/pricing" className="font-semibold text-brand-700 underline dark:text-lime-400">Calculate yours</Link>.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Legal requests only.</strong> We decline gambling, adult content, counterfeit or pirated products, and anything
          that breaks a vendor&apos;s terms. <Link href="/legal/prohibited-items" className="inline-block py-1 font-semibold underline">See the full list</Link>.
        </div>
      </section>
      <JsonLd data={[
        breadcrumbSchema([{ name: "Services", path: "/services" }]),
        ...SERVICE_CATEGORIES.map((c) => serviceSchema({ name: c.headline, serviceType: c.title, description: c.summary, path: `/services/${c.slug}`, examples: c.examples })),
      ]} />
    </>
  );
}
