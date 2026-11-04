import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const PRIVATE = ["/dashboard", "/admin", "/pay", "/payfx", "/checkout", "/checkout-admin", "/api", "/auth", "/login", "/signup", "/forgot-password", "/reset-password", "/track"];

/**
 * Search engines and AI answer engines (ChatGPT, Claude, Perplexity, Gemini,
 * Copilot…) are explicitly welcome on public pages, so the business can be
 * cited in AI answers. Private/account areas are excluded for everyone.
 */
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot", "Meta-ExternalAgent", "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${site.url.replace(/\/$/, "")}/sitemap.xml`,
    host: site.url,
  };
}
