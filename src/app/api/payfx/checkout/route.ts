import { NextResponse } from "next/server";
import { CURRENCIES, convert, gatewayName, round2, type CurrencyCode } from "@/lib/payfx/catalog";
import { getProductsById } from "@/lib/payfx/products";
import { GATEWAYS, type GatewayId } from "@/lib/payfx/gateways";
import { createOrder, newOrderRef, storeConfigured } from "@/lib/payfx/store";
import { siteBase } from "@/lib/payfx/orders";
import { getUsdRate } from "@/lib/payfx/settings";
import { getBankSettings, transferAvailable } from "@/lib/payfx/transfer";
import { toTransferView } from "@/lib/payfx/transfer-view";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

// Per-instance throttle: 10 checkouts per IP per 10 minutes.
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= 10;
}

/** Creates the order + invoice, then returns the gateway's hosted checkout URL. */
export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const gateway = String(body.gateway ?? "") as GatewayId | "transfer";
  const currency: CurrencyCode = body.currency === "USD" ? "USD" : "NGN";

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter your name and a valid email." }, { status: 400 });
  const bank = await getBankSettings();
  if (gateway === "transfer") {
    if (!transferAvailable(bank)) return NextResponse.json({ error: "Bank transfer is not available right now. Please choose another payment method." }, { status: 400 });
    if (currency !== "NGN") return NextResponse.json({ error: "Bank transfer is in Naira only. Switch the currency to NGN." }, { status: 400 });
  } else {
    if (!(gateway in GATEWAYS)) return NextResponse.json({ error: "Choose a payment method." }, { status: 400 });
    const gw = GATEWAYS[gateway];
    if (!gw.configured()) return NextResponse.json({ error: `${gatewayName(gateway)} is not available right now.` }, { status: 400 });
    if (!gw.currencies().includes(currency)) {
      return NextResponse.json({ error: `${gatewayName(gateway)} does not accept ${currency}. Choose another payment method or currency.` }, { status: 400 });
    }
  }
  if (!storeConfigured()) return NextResponse.json({ error: "Checkout is not set up yet. Please contact us." }, { status: 503 });

  // Prices always come from the server (database or built-in list), never from the browser.
  const [ITEMS_BY_ID, usdRate] = await Promise.all([getProductsById(), getUsdRate()]);
  const ids = [...new Set(Array.isArray(body.items) ? body.items.map(String) : [])].filter((id) => ITEMS_BY_ID.has(id));
  if (!ids.length) return NextResponse.json({ error: "Select at least one item." }, { status: 400 });
  const lines = ids.map((id) => {
    const i = ITEMS_BY_ID.get(id)!;
    return { id, name: i.name, subtitle: i.subtitle, period: i.period, purpose: i.purpose, amount: convert(i.amount, currency, usdRate), ngnAmount: i.amount, logo: i.logo };
  });

  const ref = newOrderRef();
  let order;
  try {
    order = await createOrder({
      ref,
      status: "pending",
      gateway,
      payRef: ref,
      customer: {
        name: name.slice(0, 120),
        email: email.slice(0, 160),
        phone: String(body.phone ?? "").trim().slice(0, 40),
        company: String(body.company ?? "").trim().slice(0, 120),
      },
      currency,
      rate: usdRate,
      items: lines,
      total: round2(lines.reduce((s, l) => s + l.amount, 0)),
      ngnTotal: lines.reduce((s, l) => s + l.ngnAmount, 0),
      createdAt: new Date().toISOString(),
      source: "webpurchase.app/checkout",
      ...(gateway === "transfer"
        ? { transfer: { status: "awaiting_receipt" as const, dueAt: new Date(Date.now() + bank.windowMinutes * 60_000).toISOString(), receipts: [] } }
        : {}),
    });
  } catch (e) {
    console.error("[payfx] create order failed", e);
    return NextResponse.json({ error: "Could not create your invoice. Please try again." }, { status: 500 });
  }

  const invoiceUrl = `/checkout/invoice/${order.ref}`;
  if (gateway === "transfer") {
    return NextResponse.json({ transfer: toTransferView(order, bank), invoiceUrl, linkUrl: `/checkout/link/${order.ref}?pay=transfer` });
  }
  try {
    const callback = `${siteBase(request)}/checkout/callback/${order.payRef}`;
    const url = order.gateway === "paystack"
      ? await GATEWAYS.paystack.initialize(order, callback)
      : await GATEWAYS.flutterwave.initialize(order, callback, site.name);
    return NextResponse.json({ checkoutUrl: url, invoiceUrl });
  } catch (e) {
    console.error("[payfx] gateway init failed", e);
    return NextResponse.json({ error: "Could not reach the payment gateway. Please try again.", invoiceUrl }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ currencies: Object.keys(CURRENCIES) });
}
