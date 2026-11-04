import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "./contact-form";
import { WhatsAppIcon } from "@/components/ui";
import { site, whatsappLink } from "@/lib/site";
import { getFeeSettings } from "@/lib/settings";
import { describeBusinessHours } from "@/lib/business-hours";

export const metadata: Metadata = { title: "Contact us", description: "Reach Web Purchase by WhatsApp, email, phone or our contact form." };

export default async function ContactPage() {
  const fees = await getFeeSettings();
  return (
    <section className="container grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="h2 mt-4">We&apos;re here to help</h1>
        <p className="muted mt-3">The fastest way to reach us is WhatsApp. For anything else, send us a message.</p>
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-lg mt-6 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
          <WhatsAppIcon /> Chat on WhatsApp
        </a>
        <ul className="mt-8 space-y-4 text-sm">
          <li className="flex gap-3"><Mail className="h-5 w-5 text-brand-600 dark:text-lime-400" /><a href={`mailto:${site.email}`} className="hover:underline">{site.email}</a></li>
          <li className="flex gap-3"><Phone className="h-5 w-5 text-brand-600 dark:text-lime-400" /><a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:underline">{site.phone}</a></li>
          <li className="flex gap-3"><MapPin className="h-5 w-5 text-brand-600 dark:text-lime-400" /><span>{site.address}</span></li>
          <li className="flex gap-3"><Clock className="h-5 w-5 text-brand-600 dark:text-lime-400" /><span>{describeBusinessHours(fees.business_hours)}</span></li>
        </ul>
      </div>
      <ContactForm />
    </section>
  );
}
