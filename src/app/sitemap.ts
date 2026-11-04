import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const PATHS = ["", "/services", "/shop-and-ship", "/pricing", "/track", "/about", "/contact", "/faq", "/legal/terms", "/legal/privacy", "/legal/refund", "/legal/prohibited-items", "/signup", "/login"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${site.url}${p}`, changeFrequency: p === "" || p === "/pricing" ? "daily" : "monthly", priority: p === "" ? 1 : 0.6 }));
}
