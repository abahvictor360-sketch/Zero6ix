import Link from "next/link";
import { CheckCircle2, Clock, Package, Wallet } from "lucide-react";
import { listOrders, listProducts, StoreError } from "@/lib/payfx/admin-store";
import { money } from "@/lib/payfx/catalog";
import { Alert, PageHeader, StatCard } from "@/components/ui";
import { OrdersTable } from "./orders/orders-table";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  let error = "";
  const [orders, products] = await Promise.all([
    listOrders({ limit: 500 }).catch((e) => { error = e instanceof StoreError ? e.message : "Could not load orders."; return []; }),
    listProducts().catch(() => null),
  ]);
  const paid = orders.filter((o) => o.status === "paid");
  const pending = orders.filter((o) => o.status === "pending");
  const revenue = paid.reduce((s, o) => s + Number(o.ngnTotal || 0), 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const revenueMonth = paid.filter((o) => new Date(o.paidAt ?? o.createdAt) >= monthStart).reduce((s, o) => s + Number(o.ngnTotal || 0), 0);

  return (
    <>
      <PageHeader title="Overview" description="Checkout payments at a glance." actions={<Link href="/checkout-admin/items/new" className="btn btn-dark btn-sm">Add item</Link>} />
      {error && <Alert tone="error" className="mb-6">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paid (all time)" value={money(revenue)} hint={`${paid.length} paid order${paid.length === 1 ? "" : "s"}`} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Paid this month" value={money(revenueMonth)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Awaiting payment" value={pending.length} hint="Invoices created, not yet paid" icon={<Clock className="h-5 w-5" />} />
        <StatCard
          label="Items on checkout"
          value={products ? products.filter((p) => p.active).length : "–"}
          hint={products ? `${products.filter((p) => !p.active).length} hidden` : "Items table not set up yet"}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <Link href="/checkout-admin/orders" className="text-sm font-medium text-brand-700 hover:underline dark:text-lime-400">See all</Link>
      </div>
      <div className="mt-3"><OrdersTable orders={orders.slice(0, 8)} /></div>
    </>
  );
}
