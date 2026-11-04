import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Refund Policy</h1>
      <p className="text-sm text-slate-500">Last updated: 4 November 2026</p>

      <h2>Full refunds</h2>
      <ul>
        <li>We are unable to complete your request after you have paid (e.g. the vendor rejects the payment and no alternative is possible).</li>
        <li>We decline your request after payment following compliance review.</li>
        <li>An item is lost in transit while in our or our courier&apos;s care.</li>
      </ul>

      <h2>Partial refunds</h2>
      <ul>
        <li>The final cost is lower than quoted (e.g. a vendor discount or lighter shipping weight) — we refund the difference.</li>
        <li>An order is partially fulfilled — we refund the unfulfilled portion.</li>
      </ul>

      <h2>Not refundable</h2>
      <ul>
        <li>Services or items successfully paid for/delivered as requested, including digital subscriptions and exam fees, once the vendor has accepted payment. Vendor refunds follow the vendor&apos;s own policy; we will help you request them.</li>
        <li>Losses due to incorrect information you provided (wrong account email, size, address).</li>
        <li>Items seized by customs because they were prohibited or misdescribed by you.</li>
        <li>Exchange-rate movements after your quote expires.</li>
      </ul>

      <h2>How to request a refund</h2>
      <p>Message us from the order page in your dashboard or email <a href={`mailto:${site.email}`}>{site.email}</a> with your order ID within 14 days of the issue. Approved refunds are returned to the original payment method or your Nigerian bank account within 3–10 working days.</p>

      <h2>Damaged or incorrect items</h2>
      <p>Report damaged or incorrect items within 48 hours of delivery with photos. Where the vendor is at fault, we&apos;ll manage the return or replacement with the vendor; return shipping may apply.</p>
    </>
  );
}
