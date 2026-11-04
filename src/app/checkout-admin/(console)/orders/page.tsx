import Link from "next/link";
import { listOrders, StoreError } from "@/lib/payfx/admin-store";
import { Alert, PageHeader } from "@/components/ui";
import { OrdersTable } from "./orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "paid" || sp.status === "pending" ? sp.status : undefined;
  let error = "";
  const orders = await listOrders({ status, q: sp.q }).catch((e) => { error = e instanceof StoreError ? e.message : "Could not load orders."; return []; });
  const tab = (s: string | undefined, label: string) => (
    <Link href={`/checkout-admin/orders${s ? `?status=${s}` : ""}`}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${status === s ? "bg-brand-900 text-white dark:bg-lime-400 dark:text-brand-950" : "border border-slate-200 dark:border-white/10"}`}>{label}</Link>
  );
  return (
    <>
      <PageHeader title="Orders" description="Every checkout invoice, newest first." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">{tab(undefined, "All")}{tab("paid", "Paid")}{tab("pending", "Pending")}</div>
        <form className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={sp.q} className="input !py-2" placeholder="Invoice no. or email" aria-label="Search orders" />
          <button className="btn btn-outline btn-sm">Search</button>
        </form>
      </div>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      <OrdersTable orders={orders} />
    </>
  );
}
