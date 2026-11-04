import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Clock, Receipt, ShieldCheck } from "lucide-react";
import { SERVICE_CATEGORIES, STEPS } from "@/lib/content";
import { getFeeSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { requestCta, site } from "@/lib/site";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbSchema, faqSchema, pageMeta, serviceSchema } from "@/lib/seo";

export function generateStaticParams() {
  return SERVICE_CATEGORIES.map((c) => ({ slug: c.slug }));
}
export const dynamicParams = false;

const find = (slug: string) => SERVICE_CATEGORIES.find((c) => c.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = find((await params).slug);
  if (!c) return {};
  return pageMeta({ title: c.seoTitle, description: c.metaDescription, path: `/services/${c.slug}` });
}

export default async function ServiceLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = find((await params).slug);
  if (!c) notFound();
  const fees = await getFeeSettings();
  const others = SERVICE_CATEGORIES.filter((o) => o.slug !== c.slug);
  const path = `/services/${c.slug}`;

  return (
    <>
      <section className="bg-brand-900 py-14 text-white dark:bg-[#06140f] sm:py-16">
        <div className="container">
         <div className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-white/60">
            <Link href="/" className="hover:text-white">Home</Link><ChevronRight className="h-3.5 w-3.5" />
            <Link href="/services" className="hover:text-white">Services</Link><ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white/90">{c.title}</span>
          </nav>
          <h1 className="h1">{c.headline}</h1>
          <p className="mt-5 text-lg text-white/80">{c.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link {...requestCta("service", c.title)} className="btn btn-primary btn-lg">Request a quote <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/pricing" className="btn btn-ghost-light btn-lg">See pricing</Link>
          </div>
         </div>
        </div>
      </section>

      <section className="container grid gap-8 py-14 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <p className="muted mt-3 leading-7">{c.intro}</p>
            <ol className="mt-6 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-400 text-sm font-bold text-brand-950">{i + 1}</span>
                  <div><p className="font-semibold">{s.title}</p><p className="muted text-sm">{s.body}</p></div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">What we pay for in {c.title.toLowerCase()}</h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {c.examples.map((e) => (
                <li key={e} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-lime-400" /> {e}</li>
              ))}
            </ul>
            <p className="muted mt-4 text-sm">Don&apos;t see yours? If it&apos;s legal and sold online, we can usually pay for it. <Link href="/contact" className="font-semibold underline">Ask us</Link>.</p>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight">Questions about {c.title.toLowerCase()}</h2>
            <FaqList items={c.faqs} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card-dark space-y-4">
            <p className="flex items-center gap-2 text-sm"><Receipt className="h-4 w-4 text-lime-400" /> Fee: <strong>{fees.percentage_fee}% + {formatMoney(fees.flat_fee_ngn)}</strong> (min {formatMoney(fees.minimum_fee_ngn)})</p>
            <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-lime-400" /> Typical turnaround: <strong>{c.turnaround}</strong></p>
            <p className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-lime-400" /> Rate locked for {fees.quote_validity_hours} hours</p>
            <Link {...requestCta("service", c.title)} className="btn btn-primary w-full">Contact us for a quote</Link>
            <p className="text-xs text-white/60">{site.name} is operated by {site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""}, Port Harcourt, Nigeria. Legal requests only.</p>
          </div>
          <div className="card">
            <p className="font-semibold">Other services</p>
            <ul className="mt-3 space-y-2 text-sm">
              {others.map((o) => <li key={o.slug}><Link href={`/services/${o.slug}`} className="hover:underline">{o.title}</Link></li>)}
              <li><Link href="/shop-and-ship" className="hover:underline">Shop &amp; Ship (buy from Amazon, eBay & more)</Link></li>
            </ul>
          </div>
        </aside>
      </section>

      <JsonLd data={[
        serviceSchema({ name: c.headline, serviceType: c.title, description: c.summary, path, examples: c.examples }),
        faqSchema(c.faqs),
        breadcrumbSchema([{ name: "Services", path: "/services" }, { name: c.title, path }]),
      ]} />
    </>
  );
}
