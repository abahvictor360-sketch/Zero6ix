/**
 * Marketing copy. Add testimonials only with real, consented customer quotes.
 */
export const STEPS = [
  { title: "Submit a request", body: "Tell us the service to pay for or paste the product link. Takes about 2 minutes." },
  { title: "Get a local-currency quote", body: "We confirm it's legal and send a clear quote: exchange rate, fee and shipping. Rate locked for 24 hours." },
  { title: "Pay securely", body: "Pay by card, bank transfer or USSD through Paystack or Flutterwave. We never see your card details." },
  { title: "We pay & deliver", body: "We pay the vendor in USD, GBP, EUR and more, then send you proof, access details or ship your item with tracking." },
];

export const SERVICE_CATEGORIES = [
  {
    slug: "software",
    title: "Software & subscriptions",
    examples: ["ChatGPT Plus", "Canva Pro", "Adobe Creative Cloud", "Figma", "Microsoft 365", "Notion", "Google Workspace"],
    typicalFee: "5% + ₦1,000 (min ₦2,500)",
    turnaround: "Same day",
  },
  {
    slug: "exams",
    title: "Exam & application fees",
    examples: ["IELTS", "TOEFL", "GRE / GMAT", "WES evaluation", "University application fees", "UCAS", "Common App"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Same day – 24 hrs",
  },
  {
    slug: "visa",
    title: "Visa & immigration fees",
    examples: ["US visa (MRV) support fees", "UK visa & IHS", "Canada study permit / biometrics", "Schengen appointment fees", "SEVIS I-901"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Same day",
  },
  {
    slug: "web",
    title: "Domains & hosting",
    examples: ["Namecheap / GoDaddy domains", "AWS, Google Cloud, Vercel", "Shopify plans", "WordPress hosting", "Cloudflare"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Within hours",
  },
  {
    slug: "learning",
    title: "Courses & conferences",
    examples: ["Coursera, Udemy, edX", "Professional certifications (PMI, CFA, ACCA)", "Conference tickets", "Membership dues"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Same day",
  },
  {
    slug: "ads",
    title: "Ad credits & creator tools",
    examples: ["Meta / Instagram ads", "Google Ads", "LinkedIn Premium", "TikTok Promote", "YouTube Premium", "Upwork Connects"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Within hours",
  },
];

export const ITEM_STORES = ["Amazon", "eBay", "AliExpress", "Walmart", "Best Buy", "ASOS", "Etsy", "Apple Store", "Shein", "Target"];

export const FAQS = [
  { q: "What can I pay for with Web Purchase?", a: "Any legal online service or item: software subscriptions, exam and application fees, visa fees, domains and hosting, courses, conference tickets, ad credits, and physical goods from stores like Amazon, eBay and AliExpress." },
  { q: "Can I pay from outside Nigeria?", a: "Yes. We serve Nigerians and Africans at home and abroad. Pay in Naira, or tell us your country and we'll quote you in your local African currency (e.g. Cedi, Shilling, Rand, CFA franc) where our payment partners support it." },
  { q: "How is the price calculated?", a: "Total = (foreign amount × our exchange rate) + service fee (+ shipping for physical items). The quote shows each line and locks the exchange rate for 24 hours." },
  { q: "How do I pay?", a: "Through a secure payment link powered by Paystack or Flutterwave. You can pay by card, bank transfer or USSD. We never see or store your card details." },
  { q: "How long does it take?", a: "Most service payments are completed the same day once paid. Physical items typically arrive in 5–28 days depending on the origin country." },
  { q: "What if my quote expires?", a: "Quotes lock the exchange rate for 24 hours. If it expires, just tell us and we'll re-issue it at the current rate." },
  { q: "Do I need to verify my identity?", a: "All users verify their email and phone number. For orders above ₦500,000 we also need a valid government ID. This protects you and keeps us compliant." },
  { q: "Is it safe to share my account login?", a: "Only if the service requires it. Credentials are encrypted, visible only to the operations staff processing your order, and deleted once your order is complete." },
  { q: "What can't you buy?", a: "Anything illegal or restricted: weapons, drugs, counterfeit goods, gambling, adult content, hazardous materials, items banned by Nigerian Customs, or anything that breaks a vendor's terms. See our Prohibited Items page." },
  { q: "What if something goes wrong?", a: "If we can't complete your order, you get a full refund. See our Refund Policy for details on partial refunds and vendor-side issues." },
  { q: "Do you support organisations?", a: "Yes. Schools, NGOs, startups and SMEs can pay for many tools at once, with proper invoices and monthly statements for accounting." },
];
