import "server-only";
import { envValue } from "@/lib/env";
import { supabaseAuthHeaders } from "./store";
import { EXCHANGE_RATE } from "./catalog";

/** Cache tag for public settings; the admin revalidates it after changes. */
export const SETTINGS_TAG = "payfx-settings";

/**
 * USD exchange rate for checkout: the value saved in the admin
 * (payfx_settings.usd_rate) or, if none, PAYFX_USD_RATE / ₦1,365.
 */
export async function getUsdRate(): Promise<number> {
  const base = (envValue("PAYFX_SUPABASE_URL") || envValue("SUPABASE_URL")).replace(/\/$/, "");
  const key = envValue("PAYFX_SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) return EXCHANGE_RATE;
  try {
    const res = await fetch(`${base}/rest/v1/payfx_settings?select=value&key=eq.usd_rate&limit=1`, {
      headers: supabaseAuthHeaders(key),
      next: { revalidate: 60, tags: [SETTINGS_TAG] },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return EXCHANGE_RATE;
    const [row] = (await res.json()) as { value: unknown }[];
    const n = Number(row?.value);
    return Number.isFinite(n) && n >= 100 && n <= 100000 ? n : EXCHANGE_RATE;
  } catch {
    return EXCHANGE_RATE;
  }
}
