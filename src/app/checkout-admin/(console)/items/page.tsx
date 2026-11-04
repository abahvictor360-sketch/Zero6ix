import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { listProducts, StoreError, type ProductRow } from "@/lib/payfx/admin-store";
import { money, type LogoKey } from "@/lib/payfx/catalog";
import { LOGOS, logoSvg } from "@/lib/payfx/icons";
import { Alert, EmptyState, PageHeader, Pill } from "@/components/ui";
import { toggleProductAction } from "../../actions";
import { DeleteButton } from "./delete-button";

export const metadata = { title: "Items" };

const missingTable = (e: unknown) => e instanceof StoreError && (e.code === "42P01" || e.code === "PGRST205" || /payfx_products/.test(e.message));

export default async function AdminItems({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string }> }) {
  const sp = await searchParams;
  let rows: ProductRow[] = [];
  let error = "";
  try {
    rows = await listProducts();
  } catch (e) {
    error = missingTable(e)
      ? "The items table does not exist in the database yet. Run supabase/leadloop/payfx_products.sql in the Supabase SQL editor (leadloop project), or approve the setup request."
      : e instanceof StoreError ? e.message : "Could not load items.";
  }
  const total = rows.filter((r) => r.active).reduce((s, r) => s + r.amount_ngn, 0);

  return (
    <>
      <PageHeader
        title="Items"
        description="What customers can pay for on the checkout page. Changes show on the site within a minute."
        actions={<Link href="/checkout-admin/items/new" className="btn btn-dark btn-sm"><Plus className="h-4 w-4" /> Add item</Link>}
      />
      {sp.saved && <Alert tone="success" className="mb-4">Item saved.</Alert>}
      {sp.deleted && <Alert tone="success" className="mb-4">Item deleted.</Alert>}
      {(sp.error || error) && <Alert tone="error" className="mb-4">{sp.error || error}</Alert>}

      {!error && !rows.length ? (
        <EmptyState title="No items yet" description="Add the first item customers can pay for." action={<Link href="/checkout-admin/items/new" className="btn btn-dark btn-sm">Add item</Link>} />
      ) : rows.length > 0 && (
        <>
          <ul className="space-y-3">
            {rows.map((r) => {
              const logo = (r.logo in LOGOS ? r.logo : "other") as LogoKey;
              return (
                <li key={r.id} className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${r.active ? "" : "opacity-60"}`}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-white/10" dangerouslySetInnerHTML={{ __html: logoSvg(logo) }} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{r.name}</strong>
                        {r.subtitle && <span className="text-sm text-slate-500">({r.subtitle})</span>}
                        {r.active ? <Pill tone="green">Live</Pill> : <Pill>Hidden</Pill>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{r.purpose}</p>
                      <p className="mt-1 text-xs text-slate-500">{r.period} · Order {r.sort_order} · ID {r.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-lg font-bold">{money(r.amount_ngn)}</span>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/checkout-admin/items/${encodeURIComponent(r.id)}`} className="btn btn-outline btn-sm"><Pencil className="h-4 w-4" /> Edit</Link>
                      <form action={toggleProductAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={String(!r.active)} />
                        <button className="btn btn-outline btn-sm">{r.active ? "Hide" : "Show"}</button>
                      </form>
                      <DeleteButton id={r.id} name={r.subtitle ? `${r.name} (${r.subtitle})` : r.name} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-right text-sm text-slate-500">Total of live items: <strong className="text-slate-900 dark:text-white">{money(total)}</strong></p>
        </>
      )}
    </>
  );
}
