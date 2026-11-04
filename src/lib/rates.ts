import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMarkup } from "@/lib/pricing";

interface ApiResponse {
  result?: string;
  rates?: Record<string, number>;
  conversion_rates?: Record<string, number>;
}

/**
 * Fetch market rates (USD base) and convert to NGN-per-unit. Works with
 * open.er-api.com (free, default) or any ExchangeRate-API compatible URL.
 */
export async function fetchMarketRatesNgn(): Promise<Record<string, number>> {
  const url = process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest/USD";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Rate API responded ${res.status}`);
  const json = (await res.json()) as ApiResponse;
  const rates = json.rates ?? json.conversion_rates;
  if (!rates?.NGN) throw new Error("Rate API response missing NGN");
  const ngnPerUsd = rates.NGN;
  return Object.fromEntries(Object.entries(rates).filter(([, v]) => v > 0).map(([cur, perUsd]) => [cur, ngnPerUsd / perUsd]));
}

/** Update every currency whose source is 'api': buy = market, sell = market + markup. */
export async function syncRatesFromApi() {
  const market = await fetchMarketRatesNgn();
  const db = createAdminClient();
  const { data: rows } = await db.from("exchange_rates").select("currency, markup_percent").eq("source", "api");
  const updated: string[] = [];
  const skipped: string[] = [];
  for (const row of rows ?? []) {
    const m = market[row.currency];
    if (!m) { skipped.push(row.currency); continue; }
    const api = Math.round(m * 10000) / 10000;
    const { error } = await db.from("exchange_rates").update({
      api_rate: api,
      buy_rate: api,
      sell_rate: applyMarkup(api, Number(row.markup_percent)),
      updated_at: new Date().toISOString(),
      updated_by: null,
    }).eq("currency", row.currency);
    (error ? skipped : updated).push(row.currency);
  }
  // Keep a reference market rate on manual currencies too (shown in admin for comparison).
  const { data: manual } = await db.from("exchange_rates").select("currency").eq("source", "manual");
  for (const row of manual ?? []) {
    if (market[row.currency]) await db.from("exchange_rates").update({ api_rate: Math.round(market[row.currency] * 10000) / 10000 }).eq("currency", row.currency);
  }
  return { updated, skipped };
}
