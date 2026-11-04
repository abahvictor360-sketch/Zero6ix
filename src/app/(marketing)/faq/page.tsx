import type { Metadata } from "next";
import Link from "next/link";
import { FaqList, faqJsonLd } from "@/components/site/faq-list";
import { FAQS } from "@/lib/content";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about Web Purchase payments, pricing, shipping, KYC and refunds." };

export default function FaqPage() {
  return (
    <section className="container max-w-3xl py-16">
      <div className="mb-10 text-center">
        <p className="eyebrow">FAQ</p>
        <h1 className="h2 mt-4">Frequently asked questions</h1>
      </div>
      <FaqList items={FAQS} />
      <p className="muted mt-8 text-center">Still have questions? <Link href="/contact" className="font-semibold text-brand-700 underline dark:text-lime-400">Contact us</Link>.</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }} />
    </section>
  );
}
