import "server-only";
import { headers } from "next/headers";
import { site } from "@/lib/site";

/**
 * Absolute site URL for links we send to customers or admins. Production uses
 * NEXT_PUBLIC_SITE_URL (never the request Host header); previews and local
 * dev fall back to the host the admin is using.
 */
export async function publicSiteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env && (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return env || site.url.replace(/\/$/, "");
}
