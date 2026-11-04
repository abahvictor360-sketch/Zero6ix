import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-slate-500">Last updated: 4 November 2026</p>
      <p>This policy explains how {site.company} (&quot;we&quot;), operator of {site.name}, collects, uses and protects your personal data in line with the Nigeria Data Protection Act 2023 (NDPA) and related regulations.</p>

      <h2>Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, phone number, address, organisation details.</li>
        <li><strong>Verification data:</strong> government ID and, for organisations, registration documents, only when required.</li>
        <li><strong>Order data:</strong> requests, product links, quotes, payment references, shipping details, messages and uploaded files.</li>
        <li><strong>Service credentials:</strong> only if you choose to share them for an order; stored encrypted (AES-256-GCM).</li>
        <li><strong>Messages you send us</strong> via our contact form, email, phone or WhatsApp.</li>
        <li><strong>Technical data:</strong> IP address, device and log data used for security and fraud prevention.</li>
      </ul>
      <p>We do <strong>not</strong> collect or store your card details. These are handled by our PCI-DSS compliant payment providers.</p>

      <h2>How we use your data</h2>
      <ul>
        <li>To provide our services: review requests, issue quotes, process payments, pay vendors and deliver items (contract).</li>
        <li>To verify identity and prevent fraud, money laundering and abuse (legal obligation & legitimate interest).</li>
        <li>To send service notifications by email, WhatsApp and in-app (contract). You can opt out of optional messages at any time by contacting us.</li>
        <li>To keep financial records as required by law.</li>
      </ul>

      <h2>Sharing</h2>
      <p>We share data only as needed with: payment providers (Paystack, Flutterwave), vendors you ask us to pay, couriers and customs agents, our hosting, email and messaging providers (e.g. Supabase, Vercel, Resend, Meta WhatsApp), and authorities where required by law. We never sell your data.</p>

      <h2>International transfers</h2>
      <p>Some providers process data outside Nigeria. We rely on appropriate safeguards as required by the NDPA.</p>

      <h2>Retention</h2>
      <p>Order and payment records are kept for at least 6 years for tax and regulatory purposes. Shared credentials can be deleted by you at any time after order completion and are purged by us when no longer needed. KYC documents are kept for as long as required by law.</p>

      <h2>Security</h2>
      <p>Encryption in transit (HTTPS) and at rest, role-based access with two-factor authentication for staff, row-level security in our database, rate limiting and a full audit log of staff actions.</p>

      <h2>Your rights</h2>
      <p>You may request access to, correction of, or deletion of your data, object to processing, or request portability, subject to legal retention requirements. Contact <a href={`mailto:${site.email}`}>{site.email}</a>. You may also complain to the Nigeria Data Protection Commission (NDPC).</p>

      <h2>Contact us</h2>
      <p>{site.company}, {site.address}. Email: <a href={`mailto:${site.email}`}>{site.email}</a> · Phone: {site.phone}.</p>

      <h2>Cookies</h2>
      <p>We use essential cookies to keep you signed in and remember preferences such as dark mode. We do not use advertising cookies.</p>
    </>
  );
}
