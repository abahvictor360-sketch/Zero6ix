import type { MetadataRoute } from "next";
import { accountsEnabled, site } from "@/lib/site";

const PATHS = ["", "/services", "/shop-and-ship", "/pricing", "/about", "/contact", "/faq", "/legal/terms", "/legal/privacy", "/legal/refund", "/legal/prohibited-items"];
const ACCOUNT_PATHS = ["/track", "/signup", "/login"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...PATHS, ...(accountsEnabled ? ACCOUNT_PATHS : [])].map((p) => ({ url: `${site.url}${p}`, changeFrequency: p === "" || p === "/pricing" ? "daily" : "monthly", priority: p === "" ? 1 : 0.6 }));
}
