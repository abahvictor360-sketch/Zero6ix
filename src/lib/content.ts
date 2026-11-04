/**
 * Marketing copy. Add testimonials only with real, consented customer quotes.
 *
 * Writing for answer engines (AEO): each answer starts with a direct, complete
 * sentence that still makes sense when quoted on its own, then adds detail.
 */
export const STEPS = [
  { title: "Submit a request", body: "Tell us the service to pay for or paste the product link. Takes about 2 minutes." },
  { title: "Get a local-currency quote", body: "We confirm it's legal and send a clear quote: exchange rate, fee and shipping. Rate locked for 24 hours." },
  { title: "Pay securely", body: "Pay by card, bank transfer or USSD through Paystack or Flutterwave. We never see your card details." },
  { title: "We pay & deliver", body: "We pay the vendor in USD, GBP, EUR and more, then send you proof, access details or ship your item with tracking." },
];

export interface ServiceCategory {
  slug: string;
  title: string;
  /** H1 / title for the dedicated landing page */
  headline: string;
  /** Search result title (kept under ~45 chars; " | Web Purchase" is appended) */
  seoTitle: string;
  /** Search result description (under ~158 chars) */
  metaDescription: string;
  /** Answer-first summary shown on the page */
  summary: string;
  intro: string;
  examples: string[];
  typicalFee: string;
  turnaround: string;
  faqs: { q: string; a: string }[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    slug: "software",
    seoTitle: "Pay for ChatGPT, Canva & Adobe from Nigeria",
    metaDescription: "We pay ChatGPT Plus, Canva Pro, Adobe, Figma, Microsoft 365 and other subscriptions in USD for you. Pay in Naira or your local currency. Same-day service.",
    title: "Software & subscriptions",
    headline: "Pay for software subscriptions from Nigeria",
    summary: "Web Purchase pays for ChatGPT Plus, Canva Pro, Adobe Creative Cloud, Figma, Microsoft 365 and other software subscriptions in USD on your behalf. You pay in Naira or your local African currency.",
    intro: "Nigerian cards are often declined by foreign software vendors, or blocked by FX limits. Send us the plan you want and the account email, and we pay the vendor directly in dollars, pounds or euros, usually the same day.",
    examples: ["ChatGPT Plus", "Canva Pro", "Adobe Creative Cloud", "Figma", "Microsoft 365", "Notion", "Google Workspace"],
    typicalFee: "5% + ₦1,000 (min ₦2,500)",
    turnaround: "Same day",
    faqs: [
      { q: "How can I pay for ChatGPT Plus or Canva Pro from Nigeria?", a: "Contact Web Purchase with the plan and the email on your account; we send a Naira quote, you pay by card, transfer or USSD, and we pay the vendor in USD the same day." },
      { q: "Do you need my password to pay for a subscription?", a: "Usually not. Most subscriptions can be paid with a gift, invite or team seat to your email. If a vendor requires a login, credentials are encrypted and deleted after the order." },
      { q: "Can you renew a subscription every month?", a: "Yes. Tell us the renewal date and we will quote and pay each renewal, or pay annually to save on fees and exchange-rate changes." },
    ],
  },
  {
    slug: "exams",
    seoTitle: "Pay IELTS, TOEFL, WES & UCAS fees in Naira",
    metaDescription: "We pay IELTS, TOEFL, GRE, WES, UCAS and university application fees in foreign currency. You pay in Naira or your local currency and get the receipt.",
    title: "Exam & application fees",
    headline: "Pay IELTS, TOEFL, WES and application fees from Nigeria",
    summary: "Web Purchase pays exam, evaluation and university application fees such as IELTS, TOEFL, GRE, GMAT, WES, UCAS and Common App in foreign currency. You pay in Naira or your local African currency.",
    intro: "Exam and application deadlines don't wait for card limits. Share the registration or application page and your candidate details, and we complete the payment and send you the official receipt.",
    examples: ["IELTS", "TOEFL", "GRE / GMAT", "WES evaluation", "University application fees", "UCAS", "Common App"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Same day – 24 hrs",
    faqs: [
      { q: "How do I pay my WES or university application fee from Nigeria?", a: "Send Web Purchase the payment page or application ID and the amount; we quote you in Naira, and once you pay we complete the fee in USD, GBP or CAD and send the receipt." },
      { q: "Will I get an official receipt?", a: "Yes. We send the vendor's receipt or confirmation, plus our own invoice and receipt for your records." },
      { q: "What if my deadline is close?", a: "Tell us the deadline when you contact us. Most exam and application fees are paid the same day once your payment is confirmed." },
    ],
  },
  {
    slug: "visa",
    seoTitle: "Pay UK visa, IHS & SEVIS fees from Nigeria",
    metaDescription: "We pay UK visa and IHS, SEVIS I-901, Canada biometrics and appointment fees on official portals in foreign currency. You pay in Naira. Fees only.",
    title: "Visa & immigration fees",
    headline: "Pay visa and immigration fees in foreign currency",
    summary: "Web Purchase helps you pay online visa and immigration fees such as UK visa and IHS, SEVIS I-901, Canada biometrics and appointment fees in foreign currency, where the official portal accepts card payments.",
    intro: "Many official portals only accept foreign cards. Share the payment page and reference, and we pay the exact fee and send you the confirmation. We only pay official government or authorised-partner portals.",
    examples: ["UK visa & IHS", "SEVIS I-901", "Canada study permit / biometrics", "Schengen appointment fees", "US visa support fees (where payable online)"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Same day",
    faqs: [
      { q: "Can Web Purchase pay my UK visa or IHS fee?", a: "Yes, where the official portal accepts card payment: send us the payment page and reference, and we pay the exact amount and return the confirmation." },
      { q: "Do you help with visa applications?", a: "No. We only pay fees; we do not prepare, submit or advise on visa applications." },
    ],
  },
  {
    slug: "web",
    seoTitle: "Pay for domains, AWS & hosting in Naira",
    metaDescription: "We pay Namecheap, GoDaddy, AWS, Google Cloud, Vercel, Shopify and Cloudflare bills in USD. You pay in Naira or your local African currency.",
    title: "Domains & hosting",
    headline: "Pay for domains, hosting and cloud services from Nigeria",
    summary: "Web Purchase pays for domains, hosting and cloud services such as Namecheap, GoDaddy, AWS, Google Cloud, Vercel, Shopify and Cloudflare in USD. You pay in Naira or your local African currency.",
    intro: "Keep your websites and apps online without card declines. We pay registrations, renewals and monthly cloud bills, and can handle recurring renewals for businesses.",
    examples: ["Namecheap / GoDaddy domains", "AWS, Google Cloud, Vercel", "Shopify plans", "WordPress hosting", "Cloudflare"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Within hours",
    faqs: [
      { q: "Can you pay my AWS or Vercel bill every month?", a: "Yes. Send the invoice each month, or arrange a recurring schedule, and we pay it in USD after you pay the Naira quote." },
      { q: "Can you register a domain in my name?", a: "Yes. We pay for the domain in your own registrar account so you keep full ownership." },
    ],
  },
  {
    slug: "learning",
    seoTitle: "Pay Coursera, Udemy, PMI & ACCA fees in Naira",
    metaDescription: "We pay Coursera, Udemy, edX, PMI, CFA, ACCA and conference fees in foreign currency for you. Pay in Naira or your local African currency.",
    title: "Courses & conferences",
    headline: "Pay for online courses, certifications and conference tickets",
    summary: "Web Purchase pays for online courses, professional certifications and conference tickets such as Coursera, Udemy, edX, PMI, CFA and ACCA in foreign currency. You pay in Naira or your local African currency.",
    intro: "Invest in your skills without fighting payment limits. We pay course fees, exam registrations for professional bodies, membership dues and event tickets.",
    examples: ["Coursera, Udemy, edX", "Professional certifications (PMI, CFA, ACCA)", "Conference tickets", "Membership dues"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Same day",
    faqs: [
      { q: "Can you pay for my Coursera or Udemy course?", a: "Yes. Send us the course link and your account email, and we pay it in foreign currency after you pay the Naira quote." },
      { q: "Can you pay professional body fees like PMI, CFA or ACCA?", a: "Yes. We pay registration, exam and membership fees on the official site and send you the receipt." },
    ],
  },
  {
    slug: "ads",
    seoTitle: "Fund Facebook, Google & TikTok ads in Naira",
    metaDescription: "We pay Meta, Google and TikTok ad credits, LinkedIn Premium, YouTube Premium and Upwork Connects in USD. You pay in Naira or local currency.",
    title: "Ad credits & creator tools",
    headline: "Pay for ad credits and creator tools in foreign currency",
    summary: "Web Purchase pays for Meta (Facebook and Instagram) ads, Google Ads, LinkedIn Premium, TikTok Promote, YouTube Premium and Upwork Connects in foreign currency. You pay in Naira or your local African currency.",
    intro: "Run campaigns and grow your business without card declines. We top up ad accounts and pay for creator and freelancer tools on your behalf.",
    examples: ["Meta / Instagram ads", "Google Ads", "LinkedIn Premium", "TikTok Promote", "YouTube Premium", "Upwork Connects"],
    typicalFee: "5% + ₦1,000",
    turnaround: "Within hours",
    faqs: [
      { q: "Can you fund my Facebook or Google Ads account?", a: "Yes. We add funds or pay invoices on your ad account in USD after you pay the Naira quote. Ads must follow the platform's policies." },
      { q: "Can you buy Upwork Connects or LinkedIn Premium?", a: "Yes. We pay for these tools on your account and send you the receipt." },
    ],
  },
];

export const ITEM_STORES = ["Amazon", "eBay", "AliExpress", "Walmart", "Best Buy", "ASOS", "Etsy", "Apple Store", "Shein", "Target"];

export interface FaqGroup { title: string; items: { q: string; a: string }[] }

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "About Web Purchase",
    items: [
      { q: "What is Web Purchase?", a: "Web Purchase is a pay-for-me and shop-and-ship service operated by Zero6ix Limited (RC 8922251) in Port Harcourt, Nigeria. We pay foreign websites in USD, GBP, EUR and other currencies on your behalf, and you pay us in Naira or your local African currency." },
      { q: "What can I pay for with Web Purchase?", a: "Any legal online service or item: software subscriptions, exam and application fees, visa fees, domains and hosting, courses, conference tickets, ad credits, and physical goods from stores like Amazon, eBay and AliExpress." },
      { q: "Who uses Web Purchase?", a: "Students, freelancers, creatives, professionals and Africans in the diaspora, plus SMEs, schools, NGOs and startups that need to pay foreign vendors." },
      { q: "Can I pay from outside Nigeria?", a: "Yes. We serve Nigerians and Africans at home and abroad. Pay in Naira, or tell us your country and we'll quote you in your local African currency (e.g. Cedi, Shilling, Rand, CFA franc) where our payment partners support it." },
      { q: "Do you support organisations?", a: "Yes. Schools, NGOs, startups and SMEs can pay for many tools at once, with proper invoices and monthly statements for accounting." },
    ],
  },
  {
    title: "Pricing & payment",
    items: [
      { q: "How much does Web Purchase charge?", a: "Our service fee is 5% of the Naira amount plus ₦1,000, with a minimum fee of ₦2,500. Shipping is added for physical items. There are no hidden charges or card surcharges." },
      { q: "How is the price calculated?", a: "Total = (foreign amount × our exchange rate) + service fee (+ shipping for physical items). The quote shows each line and locks the exchange rate for 24 hours." },
      { q: "How do I pay?", a: "You pay through a secure payment link powered by Paystack or Flutterwave, by card, bank transfer or USSD. We never see or store your card details." },
      { q: "What if my quote expires?", a: "Quotes lock the exchange rate for 24 hours. If it expires, just tell us and we'll re-issue it at the current rate." },
    ],
  },
  {
    title: "Orders & delivery",
    items: [
      { q: "How long does it take?", a: "Most service payments are completed the same day once paid. Physical items typically arrive in 5–28 days depending on the origin country." },
      { q: "How do I buy from Amazon and ship to Nigeria?", a: "Send Web Purchase the Amazon product link, size or colour, and your delivery address. We quote the item price, our fee and shipping in Naira; after you pay, we buy it, receive it at our US hub and ship it to you with tracking." },
      { q: "Which countries can you ship from?", a: "We ship from the United States, United Kingdom, Canada, Europe, China and the UAE to Nigeria. Rates and delivery times are listed on our Shop & Ship page." },
      { q: "What if something goes wrong?", a: "If we can't complete your order, you get a full refund. See our Refund Policy for details on partial refunds and vendor-side issues." },
    ],
  },
  {
    title: "Safety & compliance",
    items: [
      { q: "Is Web Purchase legitimate?", a: "Web Purchase is operated by Zero6ix Limited, a company registered in Nigeria (RC 8922251), with an office at 28 Chief Charles Street, Trans Amadi, Port Harcourt. Payments go through licensed gateways (Paystack and Flutterwave), and every order is reviewed by a person." },
      { q: "Do I need to verify my identity?", a: "We confirm your email and phone number for every order. For orders above ₦500,000 we also need a valid government ID. This protects you and keeps us compliant." },
      { q: "Is it safe to share my account login?", a: "Only if the service requires it. Credentials are encrypted, visible only to the operations staff processing your order, and deleted once your order is complete." },
      { q: "What can't you buy?", a: "Anything illegal or restricted: weapons, drugs, counterfeit goods, gambling, adult content, hazardous materials, items banned by Nigerian Customs, or anything that breaks a vendor's terms. See our Prohibited Items page." },
    ],
  },
];

export const FAQS = FAQ_GROUPS.flatMap((g) => g.items);

/** The subset shown on the home page. */
export const HOME_FAQS = [FAQS[0], FAQS[1], FAQS[5], FAQS[7], FAQS[9], FAQS[10]];
