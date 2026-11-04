import type { Metadata } from "next";
import { site } from "./site";

/**
 * SEO + AEO helpers: per-page metadata (canonical, Open Graph, Twitter) and
 * schema.org JSON-LD describing the business so search engines and AI answer
 * engines can identify Web Purchase / Zero6ix Limited unambiguously.
 */

export const SITE_DESCRIPTION =
  "Web Purchase pays for online services and buys from foreign stores for Nigerians and Africans at home and abroad. We pay vendors in USD, GBP, EUR and more; you pay in Naira or your local African currency. Legal requests only.";

const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name}: pay for anything online, in any currency` };

export function pageMeta({
  title, description, path, absoluteTitle = false, noIndex = false,
}: { title: string; description: string; path: string; absoluteTitle?: boolean; noIndex?: boolean }): Metadata {
  const url = path === "/" ? "/" : path.replace(/\/$/, "");
  const fullTitle = absoluteTitle ? title : `${title} | ${site.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, siteName: site.name, type: "website", locale: "en_NG", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE.url] },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

const abs = (path: string) => new URL(path, site.url).toString();
const ORG_ID = `${site.url.replace(/\/$/, "")}/#organization`;

/** Parse "28 Chief Charles Street, off Peace Drive, Trans Amadi, Port Harcourt, Rivers State, Nigeria". */
function postalAddress() {
  const parts = site.address.split(",").map((s) => s.trim());
  const country = parts.pop() ?? "Nigeria";
  const region = parts.pop() ?? "";
  const locality = parts.pop() ?? "";
  return {
    "@type": "PostalAddress",
    streetAddress: parts.join(", "),
    addressLocality: locality,
    addressRegion: region,
    addressCountry: country === "Nigeria" ? "NG" : country,
  };
}

export function organizationSchema() {
  const rc = site.rcNumber.replace(/^RC\s*/i, "");
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "FinancialService"],
    "@id": ORG_ID,
    name: site.name,
    legalName: site.company,
    alternateName: [site.company, "WebPurchase"],
    url: abs("/"),
    logo: abs("/icon.svg"),
    image: abs("/opengraph-image"),
    description: SITE_DESCRIPTION,
    email: site.email,
    telephone: site.phone.replace(/\s/g, ""),
    address: postalAddress(),
    ...(rc ? { identifier: { "@type": "PropertyValue", propertyID: "CAC RC Number", value: rc } } : {}),
    areaServed: [
      { "@type": "Country", name: "Nigeria" },
      { "@type": "Place", name: "Africa" },
      { "@type": "Place", name: "African diaspora worldwide" },
    ],
    currenciesAccepted: "NGN",
    paymentAccepted: "Debit card, Credit card, Bank transfer, USSD",
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" },
    ],
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: site.phone.replace(/\s/g, ""),
      email: site.email,
      areaServed: ["NG", "GH", "KE", "ZA", "GB", "US", "CA"],
      availableLanguage: ["English"],
    }],
    knowsAbout: [
      "Paying for foreign online services from Nigeria",
      "International payments in USD, GBP and EUR",
      "Exam and application fee payments",
      "Software subscription payments",
      "Shop and ship from the US, UK, China and Europe to Nigeria",
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${abs("/")}#website`,
    name: site.name,
    url: abs("/"),
    inLanguage: "en-NG",
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path),
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function serviceSchema(s: { name: string; description: string; path: string; serviceType: string; examples?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    serviceType: s.serviceType,
    description: s.description,
    url: abs(s.path),
    provider: { "@id": ORG_ID },
    areaServed: [{ "@type": "Country", name: "Nigeria" }, { "@type": "Place", name: "Africa" }],
    ...(s.examples?.length ? {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: s.name,
        itemListElement: s.examples.map((e) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: e } })),
      },
    } : {}),
  };
}
