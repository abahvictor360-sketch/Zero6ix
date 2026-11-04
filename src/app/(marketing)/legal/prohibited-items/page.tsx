import type { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";
import { PROHIBITED_CATEGORIES } from "@/lib/compliance";

export const metadata: Metadata = { title: "Prohibited Items & Services", description: "What Web Purchase will not pay for or buy." };

export default function ProhibitedPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Prohibited Items & Services</h1>
      <p>We only accept <strong>legal</strong> requests. Every request is screened automatically and reviewed by our team before a payment link is issued. Requests that fall into the categories below will be rejected, and repeated attempts may lead to account closure and reporting to the authorities.</p>

      <div className="not-prose mt-8 grid gap-4 sm:grid-cols-2">
        {PROHIBITED_CATEGORIES.map((c) => (
          <section key={c.title} className="rounded-3xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/60 dark:bg-red-950/20">
            <h2 className="!m-0 flex items-center gap-2 !text-base font-semibold text-red-900 dark:text-red-200"><Ban className="h-4 w-4" /> {c.title}</h2>
            <ul className="!mb-0 mt-3 list-disc space-y-1 pl-5 text-sm text-red-900/80 dark:text-red-200/80">
              {c.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <h2>Restricted (case-by-case)</h2>
      <p>Drones, perfumes and aerosols, large lithium batteries, supplements, and commercial quantities of any product may require extra documentation, special shipping or may be declined.</p>

      <h2>Nigerian Customs</h2>
      <p>Physical goods must comply with the Nigeria Customs Service import prohibition list, which changes from time to time. We check each item, but you remain responsible for ensuring your item can be legally imported.</p>

      <p>Not sure? <Link href="/contact">Ask us first</Link> — we&apos;re happy to check before you submit.</p>
    </>
  );
}
