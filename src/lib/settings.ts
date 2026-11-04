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

const now = new Date().toISOString();
export const DEFAULT_RATES: ExchangeRate[] = [
  { currency: "USD", name: "US Dollar", symbol: "$", sell_rate: 1590, updated_at: now },
  { currency: "GBP", name: "British Pound", symbol: "£", sell_rate: 2095, updated_at: now },
  { currency: "EUR", name: "Euro", symbol: "€", sell_rate: 1812, updated_at: now },
  { currency: "CAD", name: "Canadian Dollar", symbol: "C$", sell_rate: 1154, updated_at: now },
  { currency: "AUD", name: "Australian Dollar", symbol: "A$", sell_rate: 1040, updated_at: now },
  { currency: "AED", name: "UAE Dirham", symbol: "AED", sell_rate: 433, updated_at: now },
  { currency: "CNY", name: "Chinese Yuan", symbol: "¥", sell_rate: 221, updated_at: now },
];

export const DEFAULT_SHIPPING: ShippingRate[] = [
  { id: "us", origin_region: "US", label: "United States → Lagos", rate_per_kg_usd: 12.5, min_charge_usd: 25, delivery_days_min: 7, delivery_days_max: 14 },
  { id: "uk", origin_region: "UK", label: "United Kingdom → Lagos", rate_per_kg_usd: 9.5, min_charge_usd: 20, delivery_days_min: 5, delivery_days_max: 10 },
  { id: "ca", origin_region: "CA", label: "Canada → Lagos", rate_per_kg_usd: 14, min_charge_usd: 30, delivery_days_min: 10, delivery_days_max: 18 },
  { id: "eu", origin_region: "EU", label: "Europe (DE/FR/NL) → Lagos", rate_per_kg_usd: 11, min_charge_usd: 25, delivery_days_min: 7, delivery_days_max: 14 },
  { id: "cn", origin_region: "CN", label: "China → Lagos", rate_per_kg_usd: 8, min_charge_usd: 15, delivery_days_min: 14, delivery_days_max: 28 },
  { id: "ae", origin_region: "AE", label: "UAE (Dubai) → Lagos", rate_per_kg_usd: 7.5, min_charge_usd: 15, delivery_days_min: 5, delivery_days_max: 10 },
];

/** Anonymous (public) client — RLS limits it to public reference data. */
function publicClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

export async function getPublicRates(): Promise<ExchangeRate[]> {
  if (!isSupabaseConfigured()) return DEFAULT_RATES;
  const { data, error } = await publicClient()
    .from("exchange_rates")
    .select("currency, name, symbol, sell_rate, updated_at")
    .eq("is_active", true)
    .order("currency");
  if (error || !data?.length) return DEFAULT_RATES;
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
