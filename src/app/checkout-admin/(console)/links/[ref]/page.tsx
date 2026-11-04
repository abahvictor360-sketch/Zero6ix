import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getOrder, linkExpired } from "@/lib/payfx/store";
import { money } from "@/lib/payfx/catalog";
import { site } from "@/lib/site";
import { publicSiteUrl } from "@/lib/payfx/site-url";
import { Alert, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { emailCustomerAction } from "../../../actions";
import { ShareLink } from "../share-link";

export const metadata = { title: "Payment link" };

export default async function AdminLinkPage({ params, searchParams }: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ created?: string; emailed?: string }>;
}) {
  const [{ ref }, sp, base] = await Promise.all([params, searchParams, publicSiteUrl()]);
  const order = await getOrder(decodeURIComponent(ref)).catch(() => null);
  if (!order) notFound();
  const url = `${base}/checkout/link/${order.ref}`;
  const first = order.customer.name.split(" ")[0];
  const total = money(order.total, order.currency);
  const paid = order.status === "paid";
  const expired = linkExpired(order);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/checkout-admin/links" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Payment links</Link>
      {sp.created && (
        <Alert tone="success" className="mb-4">
          <span className="inline-flex items-center gap-1.5 font-semibold"><CheckCircle2 className="h-4 w-4" /> Payment link created.</span>{" "}
          {sp.emailed ? `We emailed it to ${order.customer.email}. ` : ""}Copy it below to send by WhatsApp or SMS.
        </Alert>
      )}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{total} from {order.customer.name}</h1>
            <p className="muted text-sm">Invoice {order.invoiceNumber} · {order.customer.email}</p>
          </div>
          {paid ? <Pill tone="green">Paid</Pill> : expired ? <Pill>Expired</Pill> : <Pill tone="amber">Waiting for payment</Pill>}
        </div>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/10">
          {order.items.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.name}{l.subtitle ? ` (${l.subtitle})` : ""} <span className="text-slate-500">· {l.period}</span></span><span className="shrink-0 font-medium">{money(l.amount, order.currency)}</span></li>
          ))}
        </ul>
        {order.link?.message && <p className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5">“{order.link.message}”</p>}
        {!paid && (
          <>
            <ShareLink url={url} text={`Hello ${first}, here is your ${site.name} payment link for ${total} (invoice ${order.invoiceNumber}):`} />
            <p className="hint">{order.link?.expiresAt ? `Expires ${new Date(order.link.expiresAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}.` : "Does not expire."}</p>
            <form action={emailCustomerAction}>
              <input type="hidden" name="ref" value={order.ref} />
              <input type="hidden" name="kind" value="invoice" />
              <SubmitButton className="btn btn-outline btn-sm" pendingText="Sending…">Email the link {sp.emailed ? "again" : ""} to {order.customer.email}</SubmitButton>
            </form>
          </>
        )}
        <Link href={`/checkout-admin/orders/${encodeURIComponent(order.ref)}`} className="inline-block text-sm font-medium text-brand-700 hover:underline dark:text-lime-400">Manage this order (check payment, mark paid, receipts) →</Link>
      </section>
    </div>
  );
}
