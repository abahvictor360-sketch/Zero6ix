import Link from "next/link";
import { Link2, Plus } from "lucide-react";
import { listOrders, StoreError } from "@/lib/payfx/admin-store";
import { linkExpired } from "@/lib/payfx/store";
import { money } from "@/lib/payfx/catalog";
import { Alert, EmptyState, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Payment links" };

const day = (s?: string) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "Never");

export default async function AdminLinks() {
  let error = "";
  const links = await listOrders({ linksOnly: true, limit: 500 }).catch((e) => { error = e instanceof StoreError ? e.message : "Could not load links."; return []; });
  return (
    <>
      <PageHeader
        title="Payment links"
        description="Unique Paystack payment links you've sent to customers."
        actions={<Link href="/checkout-admin/links/new" className="btn btn-dark btn-sm"><Plus className="h-4 w-4" /> Create payment link</Link>}
      />
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {!links.length ? (
        <EmptyState
          title="No payment links yet"
          description="Create a link for a customer: choose checkout items or type any amount, then send it by email or WhatsApp."
          action={<Link href="/checkout-admin/links/new" className="btn btn-dark btn-sm"><Link2 className="h-4 w-4" /> Create your first link</Link>}
        />
      ) : (
        <>
        <ul className="space-y-3 md:hidden">
          {links.map((o) => (
            <li key={o.ref}>
              <Link href={`/checkout-admin/links/${encodeURIComponent(o.ref)}`} className="card block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-700 dark:text-lime-400">{o.invoiceNumber}</p>
                    <p className="truncate font-medium">{o.customer?.name}</p>
                    <p className="truncate text-xs text-slate-500">{o.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">{money(o.total, o.currency)}</p>
                    <div className="mt-1">{o.status === "paid" ? <Pill tone="green">Paid</Pill> : linkExpired(o) ? <Pill>Expired</Pill> : <Pill tone="amber">Waiting</Pill>}</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Created {day(o.createdAt)}{o.status !== "paid" ? ` · Expires ${day(o.link?.expiresAt)}` : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="card hidden overflow-hidden p-0 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {links.map((o) => (
                  <tr key={o.ref}>
                    <td className="px-4 py-3"><Link href={`/checkout-admin/links/${encodeURIComponent(o.ref)}`} className="font-semibold text-brand-700 hover:underline dark:text-lime-400">{o.invoiceNumber}</Link></td>
                    <td className="px-4 py-3"><div className="font-medium">{o.customer?.name}</div><div className="text-xs text-slate-500">{o.email}</div></td>
                    <td className="px-4 py-3 text-right font-semibold">{money(o.total, o.currency)}</td>
                    <td className="px-4 py-3">{o.status === "paid" ? <Pill tone="green">Paid</Pill> : linkExpired(o) ? <Pill>Expired</Pill> : <Pill tone="amber">Waiting</Pill>}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{day(o.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{o.status === "paid" ? "–" : day(o.link?.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </>
  );
}
