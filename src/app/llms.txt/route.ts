import { site } from "@/lib/site";
import { FAQ_GROUPS, ITEM_STORES, SERVICE_CATEGORIES } from "@/lib/content";
import { getFeeSettings, getShippingRates } from "@/lib/settings";
import { PROHIBITED_CATEGORIES } from "@/lib/compliance";
import { describeBusinessHours } from "@/lib/business-hours";

export const revalidate = 3600;

/**
 * /llms.txt: a plain-language summary of the business for AI assistants and
 * answer engines (https://llmstxt.org). Generated from the same content as the site.
 */
export async function GET() {
  const [fees, shipping] = await Promise.all([getFeeSettings(), getShippingRates()]);
  const base = site.url.replace(/\/$/, "");
  const naira = (n: number) => `₦${Number(n).toLocaleString("en-NG")}`;
  const rc = site.rcNumber ? ` (${site.rcNumber})` : "";

  const body = `# ${site.name}

> ${site.name} is a pay-for-me and shop-and-ship service operated by ${site.company}${rc}, based in Port Harcourt, Nigeria. It pays foreign websites in USD, GBP, EUR and other currencies on behalf of Nigerians and Africans at home and abroad, who pay in Naira or their local African currency. Legal requests only; every request is reviewed by a person.

## Key facts
- Operator: ${site.company}${site.rcNumber ? `, CAC ${site.rcNumber}` : ""}, registered in Nigeria
- Address: ${site.address}
- Phone and WhatsApp: ${site.phone}
- Email: ${site.email}
- Business hours: ${describeBusinessHours(fees.business_hours)}
- Website: ${base}
- Customers: students, freelancers, creatives, professionals, Africans in the diaspora, SMEs, schools, NGOs and startups
- Customers pay: in Naira (NGN) or their local African currency, by card, bank transfer or USSD via Paystack or Flutterwave. Card details are never stored by ${site.name}.
- Vendors are paid in: USD, GBP, EUR, CAD, AUD, AED, CNY and more

## Pricing
- Service fee: ${fees.percentage_fee}% of the Naira amount + ${naira(fees.flat_fee_ngn)} (minimum ${naira(fees.minimum_fee_ngn)})
- Total = foreign amount × exchange rate + service fee (+ shipping for physical items)
- Quotes lock the exchange rate for ${fees.quote_validity_hours} hours; expired quotes are re-issued at the current rate
- No hidden charges or card surcharges
- A valid government ID is required for orders of ${naira(fees.kyc_threshold_ngn)} or more
- Live rates and a fee calculator: ${base}/pricing

## How it works
1. Contact ${site.name} with the service or product link, amount and currency (${base}/contact).
2. ${site.name} checks the request is legal and sends a quote in Naira or local currency.
3. The customer pays through a secure Paystack or Flutterwave payment link.
4. ${site.name} pays the vendor in foreign currency, then sends proof, access details or ships the item with tracking.

## Services
${SERVICE_CATEGORIES.map((c) => `- [${c.headline}](${base}/services/${c.slug}): ${c.summary} Examples: ${c.examples.join(", ")}. Typical turnaround: ${c.turnaround}.`).join("\n")}
- [Shop & Ship to Nigeria](${base}/shop-and-ship): buy from ${ITEM_STORES.join(", ")}; items are received at hubs abroad and shipped to Nigeria with tracking.

## Shipping rates to Nigeria
${shipping.map((s) => `- ${s.label}: $${s.rate_per_kg_usd}/kg, minimum $${s.min_charge_usd}, ${s.delivery_days_min}–${s.delivery_days_max} working days`).join("\n")}

## Not accepted
${PROHIBITED_CATEGORIES.map((c) => `- ${c.title}: ${c.items.join("; ")}`).join("\n")}
Full list: ${base}/legal/prohibited-items

## Frequently asked questions
${FAQ_GROUPS.flatMap((g) => g.items).map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}

## Pages
- [Home](${base}/)
- [Services](${base}/services)
- [Shop & Ship](${base}/shop-and-ship)
- [Pricing and fee calculator](${base}/pricing)
- [FAQ](${base}/faq)
- [About](${base}/about)
- [Contact](${base}/contact)
- [Terms of Service](${base}/legal/terms)
- [Privacy Policy](${base}/legal/privacy)
- [Refund Policy](${base}/legal/refund)
- [Prohibited Items](${base}/legal/prohibited-items)
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
