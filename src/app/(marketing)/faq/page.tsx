import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/json-ld";
import { FAQ_GROUPS, FAQS } from "@/lib/content";
import { breadcrumbSchema, faqSchema, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "FAQ: paying foreign websites from Nigeria",
  description: "What Web Purchase pays for, fees (5% + ₦1,000), paying from abroad in Naira or African currencies, secure Paystack payment links, shipping from Amazon, delivery times, safety and refunds.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <section className="container max-w-3xl py-12 sm:py-16">
      <div className="mb-10 text-center">
        <p className="eyebrow">FAQ</p>
        <h1 className="h2 mt-4">Frequently asked questions</h1>
        <p className="muted mt-3">Everything about paying foreign websites and shopping abroad with Web Purchase.</p>
      </div>
      <div className="space-y-10">
        {FAQ_GROUPS.map((g) => (
          <div key={g.title} id={g.id} className="scroll-mt-24">
            <h2 className="mb-4 text-lg font-semibold">{g.title}</h2>
            <FaqList items={g.items} />
          </div>
        ))}
      </div>
      <p className="muted mt-10 text-center">Still have questions? <Link href="/contact" className="font-semibold text-brand-700 underline dark:text-lime-400">Contact us</Link>.</p>
      <JsonLd data={[faqSchema(FAQS), breadcrumbSchema([{ name: "FAQ", path: "/faq" }])]} />
    </section>
  );
}
