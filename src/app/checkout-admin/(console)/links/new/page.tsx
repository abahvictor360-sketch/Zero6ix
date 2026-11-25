import { getProducts } from "@/lib/payfx/products";
import { getUsdRate } from "@/lib/payfx/settings";
import { GATEWAYS } from "@/lib/payfx/gateways";
import { getBankSettings } from "@/lib/payfx/transfer";
import { logoSvg } from "@/lib/payfx/icons";
import { Alert, PageHeader } from "@/components/ui";
import { LinkForm } from "../link-form";

export const metadata = { title: "New payment link" };

export default async function NewLinkPage() {
  const [{ items }, usdRate] = await Promise.all([getProducts(), getUsdRate()]);
  const bank = await getBankSettings();
  const on = (["paystack", "flutterwave"] as const).filter((g) => GATEWAYS[g].configured());
  const names = on.map((g) => (g === "paystack" ? "Paystack" : "Flutterwave"));
  const currencies = (["NGN", "USD"] as const).filter((c) => on.some((g) => GATEWAYS[g].currencies().includes(c)) || (c === "NGN" && bank.enabled));
  const methods = [...names, ...(bank.enabled ? ["bank transfer"] : [])];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create a payment link" description={`A unique link for one customer. They open it, see what they're paying for, and choose how to pay: ${methods.join(", ") || "no payment method connected yet"}.`} />
      {!on.length && !bank.enabled && <Alert tone="warning" className="mb-6">No payment method is connected yet. Add PAYSTACK_SECRET_KEY or FLUTTERWAVE_SECRET_KEY in Vercel, or turn on bank transfer in Settings.</Alert>}
      {on.length === 1 && <Alert tone="info" className="mb-6">Only {names[0]} is connected{bank.enabled ? " (plus bank transfer)" : ""}. Add the {names[0] === "Paystack" ? "Flutterwave" : "Paystack"} key in Vercel and its button appears on every link automatically.</Alert>}
      <LinkForm
        usdRate={usdRate}
        currencies={currencies.length ? [...currencies] : ["NGN"]}
        items={items.map((i) => ({ id: i.id, label: i.subtitle ? `${i.name} (${i.subtitle})` : i.name, period: i.period, amount: i.amount, svg: logoSvg(i.logo, { size: 18 }) }))}
      />
    </div>
  );
}
