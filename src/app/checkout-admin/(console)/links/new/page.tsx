import { getProducts } from "@/lib/payfx/products";
import { getUsdRate } from "@/lib/payfx/settings";
import { GATEWAYS } from "@/lib/payfx/gateways";
import { logoSvg } from "@/lib/payfx/icons";
import { Alert, PageHeader } from "@/components/ui";
import { LinkForm } from "../link-form";

export const metadata = { title: "New payment link" };

export default async function NewLinkPage() {
  const [{ items }, usdRate] = await Promise.all([getProducts(), getUsdRate()]);
  const paystackOn = GATEWAYS.paystack.configured();
  const currencies = GATEWAYS.paystack.currencies().filter((c): c is "NGN" | "USD" => c === "NGN" || c === "USD");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create a payment link" description="A unique link for one customer. They open it, see what they're paying for, and pay with Paystack." />
      {!paystackOn && <Alert tone="warning" className="mb-6">Paystack is not connected yet. Add PAYSTACK_SECRET_KEY in Vercel and redeploy before creating links.</Alert>}
      <LinkForm
        usdRate={usdRate}
        currencies={currencies.length ? currencies : ["NGN"]}
        items={items.map((i) => ({ id: i.id, label: i.subtitle ? `${i.name} (${i.subtitle})` : i.name, period: i.period, amount: i.amount, svg: logoSvg(i.logo, { size: 18 }) }))}
      />
    </div>
  );
}
