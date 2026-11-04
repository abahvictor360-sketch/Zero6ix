import Link from "next/link";
import { listLog, StoreError, type LogRow } from "@/lib/payfx/admin-store";
import { Alert, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Activity" };

const LABELS: Record<string, string> = {
  sign_in: "Signed in",
  item_added: "Added item",
  item_updated: "Edited item",
  item_deleted: "Deleted item",
  item_hidden: "Hid item",
  item_shown: "Showed item",
  order_verified_paid: "Confirmed payment with gateway",
  order_marked_paid: "Marked order as paid",
  order_marked_unpaid: "Set order back to unpaid",
  order_invoice_emailed: "Emailed invoice",
  order_receipt_emailed: "Emailed receipt",
  order_note_saved: "Saved order note",
  order_deleted: "Deleted order",
  orders_exported: "Exported orders",
  message_read: "Marked message read",
  message_replied: "Marked message replied",
  message_archived: "Archived message",
  message_new: "Marked message new",
  message_note_saved: "Saved message note",
  message_deleted: "Deleted message",
  usd_rate_changed: "Changed USD rate",
};

function describe(r: LogRow) {
  const d = r.details ?? {};
  const bits: string[] = [];
  if (typeof d.name === "string") bits.push(d.name);
  if (typeof d.invoice === "string") bits.push(d.invoice);
  if (r.action === "usd_rate_changed") bits.push(`₦${Number(d.to).toLocaleString("en-US")}`);
  if (r.action === "item_updated" && d.from !== undefined) bits.push(`₦${Number(d.from).toLocaleString("en-US")} → ₦${Number(d.to).toLocaleString("en-US")}`);
  if (typeof d.method === "string" && r.action !== "sign_in") bits.push(d.method.replace("_", " "));
  if (r.action === "sign_in" && typeof d.method === "string") bits.push(d.method === "password" ? "with password" : "with email link");
  if (typeof d.to === "string") bits.push(`to ${d.to}`);
  if (typeof d.count === "number") bits.push(`${d.count} orders`);
  return bits.join(" · ");
}

export default async function AdminActivity() {
  let rows: LogRow[] = [];
  let error = "";
  try {
    rows = await listLog(300);
  } catch (e) {
    error = e instanceof StoreError && (e.code === "42P01" || e.code === "PGRST205")
      ? "The activity table is missing. Run supabase/leadloop/checkout_admin.sql in the Supabase SQL editor (leadloop project)."
      : e instanceof StoreError ? e.message : "Could not load activity.";
  }
  return (
    <>
      <PageHeader title="Activity" description="Everything admins have done, newest first." />
      {error && <Alert tone="warning" className="mb-4">{error}</Alert>}
      {!error && !rows.length ? <EmptyState title="No activity yet" /> : (
        <div className="card p-0">
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {rows.map((r) => {
              const isOrder = r.action.startsWith("order_") && r.action !== "order_deleted" && r.target;
              return (
                <li key={r.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-40 shrink-0 text-xs text-slate-500">{new Date(r.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}</span>
                  <span className="min-w-0 flex-1">
                    <strong>{LABELS[r.action] ?? r.action.replace(/_/g, " ")}</strong>
                    {describe(r) && <span className="text-slate-600 dark:text-slate-300"> · {describe(r)}</span>}
                    {isOrder && <> · <Link className="text-brand-700 hover:underline dark:text-lime-400" href={`/checkout-admin/orders/${encodeURIComponent(r.target!)}`}>open</Link></>}
                  </span>
                  <span className="shrink-0 truncate text-xs text-slate-500">{r.admin_email}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
