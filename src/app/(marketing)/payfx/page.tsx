import type { Metadata } from "next";
import { CURRENCIES, EXCHANGE_RATE } from "@/lib/payfx/catalog";
import { getProducts } from "@/lib/payfx/products";
import { LOGOS, logoSvg } from "@/lib/payfx/icons";
import { gatewayStatus } from "@/lib/payfx/gateways";
import { storeConfigured } from "@/lib/payfx/store";
import { PayfxCheckout } from "./payfx-checkout";

// Private payment page: not in the menu, sitemap or search results.
export const metadata: Metadata = {
  title: "PayFX: items and funding required",
  description: "Select the services you are paying for, then pay with Flutterwave or Paystack.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
};
export const dynamic = "force-dynamic";

export default async function PayfxPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  const { items: products } = await getProducts();
  const items = products.map((i) => ({ ...i, logoSvg: logoSvg(i.logo), logoTitle: LOGOS[i.logo].title }));
  const single = items.find((i) => i.id === item) ?? null;

  return (
    <PayfxCheckout
      items={single ? [single] : items}
      single={Boolean(single)}
      rate={EXCHANGE_RATE}
      currencies={CURRENCIES}
      gateways={gatewayStatus()}
      ready={storeConfigured()}
    />
  );
}
