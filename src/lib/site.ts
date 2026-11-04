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
