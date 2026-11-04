import Link from "next/link";
import { listOrders, StoreError } from "@/lib/payfx/admin-store";
import { money } from "@/lib/payfx/catalog";
import { Alert, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Customers" };

interface Customer { email: string; name: string; phone: string; company: string; orders: number; paidOrders: number; paidNgn: number; last: string }

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let error = "";
  const orders = await listOrders({ limit: 5000 }).catch((e) => { error = e instanceof StoreError ? e.message : "Could not load customers."; return []; });

  const map = new Map<string, Customer>();
  for (const o of orders) {
    const email = (o.email || o.customer?.email || "").toLowerCase();
    if (!email) continue;
    const c = map.get(email) ?? { email, name: "", phone: "", company: "", orders: 0, paidOrders: 0, paidNgn: 0, last: "" };
    c.orders += 1;
    if (o.status === "paid") { c.paidOrders += 1; c.paidNgn += Number(o.ngnTotal || 0); }
    if (!c.last || o.createdAt > c.last) {
      c.last = o.createdAt;
      c.name = o.customer?.name || c.name;
      c.phone = o.customer?.phone || c.phone;
      c.company = o.customer?.company || c.company;
    }
    map.set(email, c);
  }
  const needle = q.trim().toLowerCase();
  const customers = [...map.values()]
    .filter((c) => !needle || [c.email, c.name, c.company, c.phone].some((v) => v.toLowerCase().includes(needle)))
    .sort((a, b) => b.paidNgn - a.paidNgn || b.last.localeCompare(a.last));

  return (
    <>
      <PageHeader title="Customers" description={`Everyone who has started a checkout (${map.size}). Sorted by amount paid.`} />
      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} className="input !py-2" placeholder="Name, email, company or phone" aria-label="Search customers" />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {!customers.length ? (
        <EmptyState title="No customers yet" description="Customers appear once someone starts a checkout." />
      ) : (
        <>
        <ul className="space-y-3 md:hidden">
          {customers.map((c) => (
            <li key={c.email}>
              <Link href={`/checkout-admin/orders?q=${encodeURIComponent(c.email)}`} className="card block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name || c.email}</p>
                    <p className="truncate text-xs text-slate-500">{c.email}{c.company ? ` · ${c.company}` : ""}</p>
                    {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">{money(c.paidNgn)}</p>
                    <p className="text-xs text-slate-500">{c.orders} order{c.orders === 1 ? "" : "s"} · {c.paidOrders} paid</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <div className="card hidden overflow-hidden p-0 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {customers.map((c) => (
                  <tr key={c.email}>
                    <td className="px-4 py-3">
                      <Link href={`/checkout-admin/orders?q=${encodeURIComponent(c.email)}`} className="font-medium text-brand-700 hover:underline dark:text-lime-400">{c.name || c.email}</Link>
                      <div className="text-xs text-slate-500">{c.email}{c.company ? ` · ${c.company}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.phone ? <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a> : "–"}</td>
                    <td className="px-4 py-3 text-right">{c.orders}<span className="text-xs text-slate-500"> ({c.paidOrders} paid)</span></td>
                    <td className="px-4 py-3 text-right font-semibold">{money(c.paidNgn)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{c.last ? new Date(c.last).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "–"}</td>
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
