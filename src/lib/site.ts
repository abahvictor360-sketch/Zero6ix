export const site = {
  name: "Web Purchase",
  tagline: "Pay for anything online, in any currency",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "zero6ixlimited@gmail.com",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+234 803 617 7408",
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2348036177408").replace(/\D/g, ""),
  address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS ?? "28 Chief Charles Street, off Peace Drive, Trans Amadi, Port Harcourt, Rivers State, Nigeria",
  rcNumber: process.env.NEXT_PUBLIC_RC_NUMBER ?? "RC 0000000",
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
 * call-to-action opens WhatsApp with a pre-filled message instead.
 */
export const accountsEnabled = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === "true";

const CTA_MESSAGES = {
  service: "Hi Web Purchase, I'd like you to pay for a service for me.",
  item: "Hi Web Purchase, I'd like you to buy an item for me.",
  quote: "Hi Web Purchase, I'd like an exact quote.",
} as const;

/** Props for a "make a request" link: dashboard when accounts are on, WhatsApp otherwise. */
export function requestCta(type: keyof typeof CTA_MESSAGES, detail?: string) {
  if (accountsEnabled) {
    const t = type === "item" ? "item" : "service";
    return { href: `/dashboard/requests/new?type=${t}` };
  }
  const text = detail ? `${CTA_MESSAGES[type]} (${detail})` : CTA_MESSAGES[type];
  return { href: whatsappLink(text), target: "_blank", rel: "noopener noreferrer" };
}
