import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service" };
const UPDATED = "4 November 2026";

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-sm text-slate-500">Last updated: {UPDATED}</p>

      <p>These Terms govern your use of {site.name}, a service operated by {site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""} (&quot;we&quot;, &quot;us&quot;), including our website, phone, email and WhatsApp channels and related services. By contacting us with a request, creating an account or making a payment you agree to these Terms.</p>

      <h2>1. What we do</h2>
      <p>We act as your agent to pay for online services and purchase goods from vendors that you choose, using foreign currency, and, for physical goods, to receive and ship them to you in Nigeria. We are not the seller of the goods or services and are not responsible for the vendor&apos;s products, except as described in our Refund Policy.</p>

      <h2>2. Eligibility & accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter a binding contract.</li>
        <li>You must verify your email address and phone number. For orders above our published threshold, you must provide a valid government-issued ID (and, for organisations, registration documents).</li>
        <li>You are responsible for keeping your login details secure and for all activity on your account.</li>
      </ul>

      <h2>3. Legal requests only</h2>
      <p>You confirm that every request you submit is lawful in Nigeria and in the vendor&apos;s country, complies with the vendor&apos;s terms, and is not listed on our <Link href="/legal/prohibited-items">Prohibited Items & Services</Link> page. We review every request and may decline any request at our discretion, including where we suspect fraud, money laundering, sanctions violations or misuse.</p>

      <h2>4. Quotes, exchange rates & payment</h2>
      <ul>
        <li>Each quote shows the foreign amount, our exchange rate, our service fee and (for items) shipping. Quotes are valid for the period shown (usually 24 hours); the exchange rate is locked during that period.</li>
        <li>Expired quotes cannot be paid and must be re-issued at the current rate.</li>
        <li>Payments are processed by licensed payment providers (Paystack, Flutterwave). We do not receive or store your card details.</li>
        <li>We start processing only after your payment is confirmed.</li>
      </ul>

      <h2>5. Account credentials you share</h2>
      <p>Where a service requires us to log in to your account, you authorise us to use the credentials solely to complete your order. Credentials are encrypted, access is restricted and logged, and they are deleted once the order is complete (or earlier on request). We recommend changing your password afterwards.</p>

      <h2>6. Shipping, customs & delivery</h2>
      <p>Delivery timelines are estimates. You are responsible for providing an accurate delivery address and for any customs duties beyond those included in your quote. Items seized by customs because they were misdescribed by you are not eligible for refund.</p>

      <h2>7. Our liability</h2>
      <p>To the extent permitted by law, our total liability for any order is limited to the amount you paid us for that order. We are not liable for indirect losses or for the acts or omissions of vendors, couriers or customs authorities.</p>

      <h2>8. Suspension & termination</h2>
      <p>We may suspend or close accounts that breach these Terms, provide false information, or are associated with fraud or chargeback abuse. We may report suspected unlawful activity to the relevant authorities.</p>

      <h2>9. Changes</h2>
      <p>We may update these Terms from time to time. Material changes will be notified by email or on this page. Continued use after changes take effect means you accept them.</p>

      <h2>10. Governing law</h2>
      <p>These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes will first be addressed through our support team and, failing resolution, by the courts of Rivers State.</p>

      <h2>11. Contact</h2>
      <p>{site.company} (trading as {site.name}), {site.address}. Phone: <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>. Email: <a href={`mailto:${site.email}`}>{site.email}</a>.</p>
    </>
  );
}
