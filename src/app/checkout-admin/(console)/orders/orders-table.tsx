import Link from "next/link";
import { money, gatewayName } from "@/lib/payfx/catalog";
import type { OrderSummary } from "@/lib/payfx/admin-store";
import { EmptyState, Pill } from "@/components/ui";

const date = (s?: string) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) : "–");

export function OrdersTable({ orders }: { orders: OrderSummary[] }) {
  if (!orders.length) return <EmptyState title="No orders yet" description="Orders appear here once someone starts a checkout." />;
  return (
    <>
    {/* Phones: one card per order */}
    <ul className="space-y-3 md:hidden">
      {orders.map((o) => (
        <li key={o.ref}>
          <Link href={`/checkout-admin/orders/${encodeURIComponent(o.ref)}`} className="card block p-4 active:bg-slate-50 dark:active:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-brand-700 dark:text-lime-400">{o.invoiceNumber}</p>
                <p className="truncate font-medium">{o.customer?.name || o.email}</p>
                <p className="truncate text-xs text-slate-500">{o.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold">{money(o.total, o.currency)}</p>
                <div className="mt-1">{o.status === "paid" ? <Pill tone="green">Paid</Pill> : <Pill tone="amber">Pending</Pill>}</div>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{(o.items ?? []).map((i) => i.subtitle ? `${i.name} (${i.subtitle})` : i.name).join(", ")}</p>
            <p className="mt-1 text-xs text-slate-500">{gatewayName(o.gateway)} · {date(o.paidAt ?? o.createdAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
    <div className="card hidden overflow-hidden p-0 md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {orders.map((o) => (
              <tr key={o.ref} className="align-top">
                <td className="px-4 py-3">
                  <Link href={`/checkout-admin/orders/${encodeURIComponent(o.ref)}`} className="font-semibold text-brand-700 hover:underline dark:text-lime-400">{o.invoiceNumber}</Link>
                  <div className="text-xs text-slate-500">{gatewayName(o.gateway)}{o.source && !o.source.includes("webpurchase") ? " · payfx.vercel.app" : ""}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{o.customer?.name || "–"}</div>
                  <div className="text-xs text-slate-500">{o.email}{o.customer?.company ? ` · ${o.customer.company}` : ""}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {(o.items ?? []).map((i) => i.subtitle ? `${i.name} (${i.subtitle})` : i.name).join(", ") || "–"}
                </td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  {money(o.total, o.currency)}
                  {o.currency !== "NGN" && <div className="text-xs font-normal text-slate-500">{money(o.ngnTotal)}</div>}
                </td>
                <td className="px-4 py-3">{o.status === "paid" ? <Pill tone="green">Paid</Pill> : <Pill tone="amber">Pending</Pill>}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{date(o.paidAt ?? o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
