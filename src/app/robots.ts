import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/pay", "/api", "/auth"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
