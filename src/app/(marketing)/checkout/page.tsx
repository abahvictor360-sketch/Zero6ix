import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { currenciesFor } from "@/lib/payfx/catalog";
import { getRateInfo, MARKET_REFRESH_SECONDS } from "@/lib/payfx/settings";
import { getBankSettings, transferAvailable } from "@/lib/payfx/transfer";
import { getProducts } from "@/lib/payfx/products";
import { LOGOS, logoSvg } from "@/lib/payfx/icons";
import { gatewayStatus } from "@/lib/payfx/gateways";
import { storeConfigured } from "@/lib/payfx/store";
import { PayfxCheckout } from "./payfx-checkout";

// Private payment page: not in the menu, sitemap or search results.
export const metadata: Metadata = {
  title: "Checkout",
  description: "Select the services you are paying for, then pay with Flutterwave or Paystack.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
};
export const dynamic = "force-dynamic";

export default async function PayfxPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  const [{ items: products }, rateInfo, bank] = await Promise.all([getProducts(), getRateInfo(), getBankSettings()]);
  const usdRate = rateInfo.rate;
  const items = products.map((i) => ({ ...i, logoSvg: logoSvg(i.logo), logoTitle: LOGOS[i.logo].title }));
  const single = items.find((i) => i.id === item) ?? null;

  if (!items.length) {
    return (
      <section className="container max-w-xl py-16 text-center sm:py-24">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold">All items are paid for</h1>
        <p className="muted mx-auto mt-2 max-w-md">There&apos;s nothing left to pay on this page right now. Thank you! If you were sent an invoice or payment link, use that, or contact us.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/contact" className="btn btn-dark">Contact us</Link>
          <Link href="/" className="btn btn-outline">Home</Link>
        </div>
      </section>
    );
  }

  return (
    <PayfxCheckout
      items={single ? [single] : items}
      single={Boolean(single)}
      rate={usdRate}
      liveRate={rateInfo.mode === "live" && !rateInfo.fallback ? { refreshSeconds: MARKET_REFRESH_SECONDS } : null}
      currencies={currenciesFor(usdRate)}
      gateways={{ ...gatewayStatus(), transfer: { on: transferAvailable(bank), currencies: ["NGN"] } }}
      ready={storeConfigured()}
    />
  );
}
