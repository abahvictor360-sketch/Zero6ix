import "server-only";
import { ITEMS, type LogoKey, type PayfxItem } from "./catalog";
import { LOGOS } from "./icons";
import { envValue } from "@/lib/env";

/**
 * Products come from the leadloop Supabase table public.payfx_products
 * (readable with the public anon/publishable key; only the owner can edit).
 * Falls back to the built-in ITEMS list if the table is unreachable.
 */
interface Row {
  id: string; name: string; subtitle: string | null; period: string; purpose: string;
  amount_ngn: number | string; logo: string; is_test: boolean; sort_order: number;
}

const base = () => (envValue("PAYFX_SUPABASE_URL") || envValue("SUPABASE_URL")).replace(/\/$/, "");
const anonKey = () => envValue("PAYFX_SUPABASE_ANON_KEY");

export async function getProducts(): Promise<{ items: PayfxItem[]; source: "database" | "built-in" }> {
  if (!base() || !anonKey()) return { items: ITEMS, source: "built-in" };
  try {
    const res = await fetch(`${base()}/rest/v1/payfx_products?select=*&active=eq.true&order=sort_order.asc`, {
      headers: { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const rows = (await res.json()) as Row[];
    const items = rows
      .filter((r) => r.logo in LOGOS && Number(r.amount_ngn) > 0)
      .map<PayfxItem>((r) => ({
        id: r.id, name: r.name, subtitle: r.subtitle ?? undefined, period: r.period, purpose: r.purpose,
        amount: Number(r.amount_ngn), logo: r.logo as LogoKey, test: r.is_test || undefined,
      }));
    return items.length ? { items, source: "database" } : { items: ITEMS, source: "built-in" };
  } catch (e) {
    console.error("[payfx] products from database failed, using built-in list", e);
    return { items: ITEMS, source: "built-in" };
  }
}

export async function getProductsById() {
  const { items } = await getProducts();
  return new Map(items.map((i) => [i.id, i]));
}
