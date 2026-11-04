export const site = {
  name: "Web Purchase",
  tagline: "Pay for anything online, in any currency",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@webpurchase.app",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+234 803 617 7408",
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2348036177408").replace(/\D/g, ""),
  address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS ?? "28 Chief Charles Street, off Peace Drive, Trans Amadi, Port Harcourt, Rivers State, Nigeria",
  company: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Zero6ix Limited",
  // Shown only when set (e.g. "RC 1234567").
  rcNumber: process.env.NEXT_PUBLIC_RC_NUMBER ?? "RC 8922251",
};

export function whatsappLink(text = "Hi Web Purchase, I'd like to make a request.") {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function absoluteUrl(path: string) {
  return new URL(path, site.url).toString();
}

/**
 * Accounts (login, sign-up, dashboards, admin, order tracking, payment links)
 * stay hidden until NEXT_PUBLIC_ACCOUNTS_ENABLED=true. Until then every request
 * call-to-action goes to the contact page instead.
 */
export const accountsEnabled = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";

/** Props for a "make a request" link: dashboard when accounts are on, the contact page otherwise. */
export function requestCta(type: "service" | "item" | "quote", detail?: string) {
  if (accountsEnabled) {
    const t = type === "item" ? "item" : "service";
    return { href: `/dashboard/requests/new?type=${t}` };
  }
  // Accounts not live yet: send people to the contact page (WhatsApp, email, call).
  void detail;
  return { href: "/contact" };
}
