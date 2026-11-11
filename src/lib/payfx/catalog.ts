/**
 * PayFX items and funding required (section 07). Amounts are in Naira.
 * Mirrors https://payfx.vercel.app (github.com/abahvictor360-sketch/payfx, src/catalog.js).
 * Exchange rate for USD checkout: US$1 = ₦1,365 (override with PAYFX_USD_RATE).
 */
export const EXCHANGE_RATE = Number(process.env.PAYFX_USD_RATE?.trim()) || 1365;

export type CurrencyCode = "NGN" | "USD";
export const CURRENCIES: Record<CurrencyCode, { code: CurrencyCode; symbol: string; perNgn: number }> = {
  NGN: { code: "NGN", symbol: "₦", perNgn: 1 },
  USD: { code: "USD", symbol: "US$", perNgn: 1 / EXCHANGE_RATE },
};

/** Currency table for a given USD rate (the admin can change the rate). */
export const currenciesFor = (usdRate: number): typeof CURRENCIES => ({
  NGN: CURRENCIES.NGN,
  USD: { ...CURRENCIES.USD, perNgn: 1 / usdRate },
});

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const convert = (ngnAmount: number, currency: CurrencyCode, usdRate = EXCHANGE_RATE) =>
  round2(ngnAmount * currenciesFor(usdRate)[currency].perNgn);

export type LogoKey = "supabase" | "claude" | "anthropic" | "googlemaps" | "apple" | "hostinger" | "deploy" | "backup" | "monitor" | "test" | "other";

export interface PayfxItem {
  id: string;
  name: string;
  subtitle?: string;
  period: string;
  purpose: string;
  amount: number; // NGN
  logo: LogoKey;
  /** Small items for trying out a real payment: not pre-selected, not in "Select all". */
  test?: boolean;
}

/** Built-in fallback list. The live list comes from the leadloop table public.payfx_products. */
export const ITEMS: PayfxItem[] = [
  { id: "anthropic-api-claude", name: "Anthropic API", subtitle: "Claude", period: "12 months", purpose: "AI that verifies clock-in selfies and shelf photos, and answers staff questions through Ask Xtend.", amount: 477750, logo: "claude" },
  { id: "google-maps-api", name: "Google Maps API", period: "12 months", purpose: "Location service that confirms which shop staff clock in from and looks up stores during bulk uploads.", amount: 641550, logo: "googlemaps" },
  { id: "apple-developer", name: "Apple Developer account", period: "12 months", purpose: "Yearly membership that lets Xtend be listed on the App Store for iPhone users.", amount: 155000, logo: "apple" },
  { id: "anthropic-api-x-metrics", name: "Anthropic API", subtitle: "X Metrics", period: "12 months", purpose: "AI that reads stock and expiry photos and writes the monthly X Metrics performance report.", amount: 204750, logo: "anthropic" },
  { id: "supabase-addon", name: "Supabase add-on", period: "12 months", purpose: "Extra database capacity for X Metrics records: supply, stock, sales, expiry dates and photos.", amount: 163800, logo: "supabase" },
  { id: "vps-upgrade", name: "VPS upgrade", subtitle: "Hostinger", period: "24 months", purpose: "More memory and disk space on the server to handle X Metrics reports and data exports.", amount: 163800, logo: "hostinger" },
  { id: "daily-backup", name: "Daily online backup", period: "12 months", purpose: "Encrypted daily copy of all company data, kept off the main server for quick recovery.", amount: 123800, logo: "backup" },
  { id: "monitoring", name: "Error and uptime monitoring", period: "6 months", purpose: "24/7 checks on every app, with instant alerts to the admin when something fails or goes down.", amount: 110150, logo: "monitor" },
];

export const ITEMS_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export const money = (n: number, currency: CurrencyCode = "NGN") =>
  `${CURRENCIES[currency].symbol}${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const gatewayName = (g: string) => ({ flutterwave: "Flutterwave", paystack: "Paystack", transfer: "Bank transfer" } as Record<string, string>)[g] ?? g;
