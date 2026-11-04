import type { MetadataRoute } from "next";
import { accountsEnabled, site } from "@/lib/site";
import { SERVICE_CATEGORIES } from "@/lib/content";

const base = site.url.replace(/\/$/, "");
const LAST_CONTENT_UPDATE = new Date("2026-11-04");

export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) => ({
    url: `${base}${path}`, lastModified: LAST_CONTENT_UPDATE, changeFrequency, priority,
  });
  return [
    entry("", 1, "daily"),
    entry("/services", 0.9, "weekly"),
    ...SERVICE_CATEGORIES.map((c) => entry(`/services/${c.slug}`, 0.85, "monthly")),
    entry("/shop-and-ship", 0.85, "weekly"),
    entry("/pricing", 0.85, "daily"),
    entry("/faq", 0.8, "monthly"),
    entry("/contact", 0.8, "monthly"),
    entry("/about", 0.7, "monthly"),
    entry("/legal/prohibited-items", 0.5, "monthly"),
    entry("/legal/terms", 0.3, "yearly"),
    entry("/legal/privacy", 0.3, "yearly"),
    entry("/legal/refund", 0.3, "yearly"),
    ...(accountsEnabled ? [entry("/track", 0.5, "monthly")] : []),
  ];
}
