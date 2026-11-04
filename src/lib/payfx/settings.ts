import "server-only";
import { envValue } from "@/lib/env";
import { supabaseAuthHeaders } from "./store";
import { EXCHANGE_RATE } from "./catalog";

/** Cache tag for public settings; the admin revalidates it after changes. */
export const SETTINGS_TAG = "payfx-settings";
/** Cache tag for the live market rate; "Refresh now" in the admin revalidates it. */
export const MARKET_TAG = "payfx-market-rate";
/** How often the live market rate is re-fetched (seconds). */
export const MARKET_REFRESH_SECONDS = 15 * 60;

export type RateMode = "fixed" | "live";

export interface RateInfo {
  /** Naira per US$1 that checkout charges right now. */
  rate: number;
  mode: RateMode;
  /** Mid-market Naira per US$1 (live mode, or for comparison), if known. */
  market: number | null;
  /** Markup added to the market rate in live mode (percent). */
  markup: number;
  /** The fixed rate saved in the admin (or the default). */
  fixed: number;
  /** When the market rate was last published by the rate provider. */
  marketUpdatedAt: string | null;
  /** True when live mode is on but the market rate couldn't be fetched (the fixed rate is used instead). */
  fallback: boolean;
}

const validRate = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) && v >= 100 && v <= 100000 ? v : null;
};
const defaultMarkup = () => {
  const m = Number(envValue("FX_MARKUP_PERCENT"));
  return Number.isFinite(m) && m >= 0 && m <= 50 ? m : 7;
};

async function readSettings(): Promise<Record<string, unknown>> {
  const base = (envValue("PAYFX_SUPABASE_URL") || envValue("SUPABASE_URL")).replace(/\/$/, "");
  const key = envValue("PAYFX_SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) return {};
  try {
    const res = await fetch(`${base}/rest/v1/payfx_settings?select=key,value&key=in.(usd_rate,rate_mode,rate_markup)`, {
      headers: supabaseAuthHeaders(key),
      next: { revalidate: 60, tags: [SETTINGS_TAG] },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as { key: string; value: unknown }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

/** Mid-market Naira per US$1 from an ExchangeRate-API compatible endpoint (cached 15 minutes). */
export async function getMarketUsdNgn(): Promise<{ rate: number; updatedAt: string } | null> {
  try {
    const url = process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest/USD";
    const res = await fetch(url, { next: { revalidate: MARKET_REFRESH_SECONDS, tags: [MARKET_TAG] }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number>; conversion_rates?: Record<string, number>; time_last_update_unix?: number };
    const rate = validRate((json.rates ?? json.conversion_rates)?.NGN);
    if (!rate) return null;
    return { rate, updatedAt: json.time_last_update_unix ? new Date(json.time_last_update_unix * 1000).toISOString() : new Date().toISOString() };
  } catch (e) {
    console.warn("[payfx] live rate fetch failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Everything about the checkout's USD rate: mode, market, markup and the rate charged now. */
export async function getRateInfo(): Promise<RateInfo> {
  const s = await readSettings();
  const mode: RateMode = s.rate_mode === "live" ? "live" : "fixed";
  const fixed = validRate(s.usd_rate) ?? EXCHANGE_RATE;
  const m = Number(s.rate_markup);
  const markup = Number.isFinite(m) && m >= 0 && m <= 50 ? m : defaultMarkup();
  const market = await getMarketUsdNgn();
  if (mode === "live" && market) {
    return { rate: Math.round(market.rate * (1 + markup / 100) * 100) / 100, mode, market: market.rate, markup, fixed, marketUpdatedAt: market.updatedAt, fallback: false };
  }
  return { rate: fixed, mode, market: market?.rate ?? null, markup, fixed, marketUpdatedAt: market?.updatedAt ?? null, fallback: mode === "live" };
}

/**
 * Naira per US$1 for checkout: live market rate + markup when the admin turns
 * on live mode, otherwise the fixed rate saved in the admin (PAYFX_USD_RATE / ₦1,365 by default).
 */
export async function getUsdRate(): Promise<number> {
  return (await getRateInfo()).rate;
}
