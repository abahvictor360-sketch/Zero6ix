import type { Metadata } from "next";
import { Building2, Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ContactForm } from "./contact-form";
import { site } from "@/lib/site";
import { getFeeSettings } from "@/lib/settings";
import { describeBusinessHours } from "@/lib/business-hours";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${site.name} by phone, email or our contact form. ${site.address}.`,
};

export default async function ContactPage() {
  const fees = await getFeeSettings();
  const details = [
    { icon: Phone, label: "Phone & WhatsApp", value: site.phone, href: `tel:${site.phone.replace(/\s/g, "")}` },
    { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, label: "Office", value: site.address },
    { icon: Clock, label: "Business hours", value: describeBusinessHours(fees.business_hours) },
  ];
  return (
    <>
      <section className="bg-brand-900 py-14 text-white dark:bg-[#06140f]">
        <div className="container max-w-3xl text-center">
          <p className="eyebrow !text-lime-300">Contact us</p>
          <h1 className="h1 mt-4">Let&apos;s get it paid for you</h1>
          <p className="mt-4 text-lg text-white/75">
            Whether you&apos;re in Nigeria or abroad, tell us what you need and we&apos;ll send a clear quote in Naira or your local African currency.
          </p>
        </div>
      </section>

      <section className="container grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_1.5fr] [&>*]:min-w-0">
        <aside className="space-y-4">
          <ul className="card divide-y divide-slate-100 p-0 dark:divide-white/10">
            {details.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime-400/25 text-brand-700 ring-1 ring-lime-400 dark:text-lime-300"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                  {href ? <a href={href} className="mt-0.5 block font-medium [overflow-wrap:anywhere] hover:underline max-[359px]:text-[15px]">{value}</a> : <p className="mt-0.5 font-medium">{value}</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="card-dark space-y-3 p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-lime-400" /> {site.company}</p>
            <p className="text-white/75">{site.name} is a service of {site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""}, registered in Nigeria.</p>
            <p className="flex items-start gap-2 text-white/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" /> Legal requests only. Payments are processed securely by licensed payment providers. We never see or store your card details.</p>
          </div>
        </aside>
        <ContactForm email={site.email} />
      </section>
    </>
  );
}
