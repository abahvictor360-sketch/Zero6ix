import { siAnthropic, siApple, siClaude, siGooglemaps, siHostinger, siSupabase } from "simple-icons";
import type { LogoKey } from "./catalog";

/**
 * Logos for PayFX items. Brand marks are filled single paths from simple-icons
 * (24×24); generic services are stroked outline paths. Path-only so the same
 * data renders as SVG on the web and as vector paths in the PDF invoice.
 */
export interface Logo {
  title: string;
  color: string;
  kind: "fill" | "stroke";
  paths: string[];
}

const brand = (icon: { title: string; hex: string; path: string }): Logo => ({
  title: icon.title, color: `#${icon.hex}`, kind: "fill", paths: [icon.path],
});

export const LOGOS: Record<LogoKey, Logo> = {
  supabase: brand(siSupabase),
  claude: brand(siClaude),
  anthropic: brand(siAnthropic),
  googlemaps: brand(siGooglemaps),
  apple: brand(siApple),
  hostinger: brand(siHostinger),
  deploy: { title: "Website deployment", color: "#EA580C", kind: "stroke", paths: [
    "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M3 8h18", "M6 6h.01", "M8.5 6h.01", "M12 17v-6", "M9.5 13.5 12 11l2.5 2.5",
  ] },
  backup: { title: "Online backup", color: "#059669", kind: "stroke", paths: [
    "M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1-.5 9", "M12 20v-7", "M9.5 15.5 12 13l2.5 2.5",
  ] },
  monitor: { title: "Uptime monitoring", color: "#DC2626", kind: "stroke", paths: ["M3 12h4l2.5-6 4 12 2.5-6H21"] },
  test: { title: "Test", color: "#6B7280", kind: "stroke", paths: ["M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0z", "m8 12.5 2.5 2.5L16 9.5"] },
};

/** Inline SVG markup for a logo (used by server and client components). */
export function logoSvg(key: LogoKey, opts: { mono?: boolean; size?: number } = {}) {
  const l = LOGOS[key];
  const color = opts.mono ? "#000" : l.color;
  // Apple's mark is black: lighten it in dark mode via currentColor.
  const fill = !opts.mono && key === "apple" ? "currentColor" : color;
  const size = opts.size ?? 24;
  const body = l.kind === "fill"
    ? l.paths.map((d) => `<path fill="${fill}" d="${d}"/>`).join("")
    : `<g fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${l.paths.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
