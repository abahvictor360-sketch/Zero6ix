import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import type { ExchangeRate, FeeSettings, ShippingRate } from "@/lib/types";

/** Defaults used when the database is not configured (e.g. first local run). */
export const DEFAULT_FEES: FeeSettings = {
  percentage_fee: 5,
  flat_fee_ngn: 1000,
  minimum_fee_ngn: 2500,
  kyc_threshold_ngn: 500000,
  quote_validity_hours: 24,
  business_hours: { timezone: "Africa/Lagos", days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00", saturday_end: "14:00" },
};

const CURRENCY_INFO = [
  { currency: "USD", name: "US Dollar", symbol: "$" },
  { currency: "GBP", name: "British Pound", symbol: "£" },
  { currency: "EUR", name: "Euro", symbol: "€" },
  { currency: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { currency: "AUD", name: "Australian Dollar", symbol: "A$" },
  { currency: "AED", name: "UAE Dirham", symbol: "AED" },
  { currency: "CNY", name: "Chinese Yuan", symbol: "¥" },
];

/**
 * LAST-RESORT values (approx. mid-market, early Nov 2026), used only if the live
 * rate service is unreachable and nothing is cached. Shown as "indicative".
 */
const FALLBACK_NGN: Record<string, number> = { USD: 1345, GBP: 1772, EUR: 1533, CAD: 976, AUD: 880, AED: 366, CNY: 187 };
export const DEFAULT_RATES: ExchangeRate[] = CURRENCY_INFO.map((c) => ({
  ...c, sell_rate: FALLBACK_NGN[c.currency], source: "fallback", updated_at: "2026-11-03T00:00:00Z",
}));

/** Markup added on top of the market rate to get our sell rate (e.g. "2" = 2%). */
const markup = () => Math.max(0, Number(process.env.FX_MARKUP_PERCENT ?? 0) || 0);

/**
 * Live market rates (NGN per unit), fetched from an ExchangeRate-API compatible
 * endpoint and cached for an hour. Used while the database isn't connected.
 */
async function getLiveRates(): Promise<ExchangeRate[] | null> {
  try {
    const url = process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest/USD";
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number>; conversion_rates?: Record<string, number>; time_last_update_unix?: number };
    const rates = json.rates ?? json.conversion_rates;
    const ngnPerUsd = rates?.NGN;
    if (!rates || !ngnPerUsd || ngnPerUsd < 100) return null;
    const updated = json.time_last_update_unix ? new Date(json.time_last_update_unix * 1000).toISOString() : new Date().toISOString();
    const m = 1 + markup() / 100;
    const out = CURRENCY_INFO.filter((c) => rates[c.currency] > 0).map((c) => ({
      ...c,
      sell_rate: Math.round((ngnPerUsd / rates[c.currency]) * m * 100) / 100,
      source: "live" as const,
      updated_at: updated,
    }));
    return out.length ? out : null;
  } catch (e) {
    console.error("[rates] live rate fetch failed", e);
    return null;
  }
}

export const DEFAULT_SHIPPING: ShippingRate[] = [
  { id: "us", origin_region: "US", label: "United States → Nigeria", rate_per_kg_usd: 12.5, min_charge_usd: 25, delivery_days_min: 7, delivery_days_max: 14 },
  { id: "uk", origin_region: "UK", label: "United Kingdom → Nigeria", rate_per_kg_usd: 9.5, min_charge_usd: 20, delivery_days_min: 5, delivery_days_max: 10 },
  { id: "ca", origin_region: "CA", label: "Canada → Nigeria", rate_per_kg_usd: 14, min_charge_usd: 30, delivery_days_min: 10, delivery_days_max: 18 },
  { id: "eu", origin_region: "EU", label: "Europe (DE/FR/NL) → Nigeria", rate_per_kg_usd: 11, min_charge_usd: 25, delivery_days_min: 7, delivery_days_max: 14 },
  { id: "cn", origin_region: "CN", label: "China → Nigeria", rate_per_kg_usd: 8, min_charge_usd: 15, delivery_days_min: 14, delivery_days_max: 28 },
  { id: "ae", origin_region: "AE", label: "UAE (Dubai) → Nigeria", rate_per_kg_usd: 7.5, min_charge_usd: 15, delivery_days_min: 5, delivery_days_max: 10 },
];

/** Anonymous (public) client: RLS limits it to public reference data. */
function publicClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function getPublicRates(): Promise<ExchangeRate[]> {
  if (!isSupabaseConfigured()) return (await getLiveRates()) ?? DEFAULT_RATES;
  const { data, error } = await publicClient()
    .from("exchange_rates")
    .select("currency, name, symbol, sell_rate, updated_at")
    .eq("is_active", true)
    .order("currency");
  if (error || !data?.length) return (await getLiveRates()) ?? DEFAULT_RATES;
  return data.map((r) => ({ ...r, sell_rate: Number(r.sell_rate) })) as ExchangeRate[];
}

export async function getFeeSettings(): Promise<FeeSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_FEES;
  const { data } = await publicClient().from("fee_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_FEES;
  return {
    percentage_fee: Number(data.percentage_fee),
    flat_fee_ngn: Number(data.flat_fee_ngn),
    minimum_fee_ngn: Number(data.minimum_fee_ngn),
    kyc_threshold_ngn: Number(data.kyc_threshold_ngn),
    quote_validity_hours: Number(data.quote_validity_hours),
    business_hours: data.business_hours ?? DEFAULT_FEES.business_hours,
  };
}

export async function getShippingRates(): Promise<ShippingRate[]> {
  if (!isSupabaseConfigured()) return DEFAULT_SHIPPING;
  const { data } = await publicClient()
    .from("shipping_rates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (!data?.length) return DEFAULT_SHIPPING;
  return data.map((r) => ({
    ...r,
    rate_per_kg_usd: Number(r.rate_per_kg_usd),
    min_charge_usd: Number(r.min_charge_usd),
  })) as ShippingRate[];
}

export const SUPPORTED_CURRENCIES = DEFAULT_RATES.map((r) => r.currency);
