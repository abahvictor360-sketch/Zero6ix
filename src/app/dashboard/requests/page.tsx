import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import type { RequestRow, RequestStatus } from "@/lib/types";

export const metadata = { title: "My requests" };

const FILTERS: { key: string; label: string; statuses?: RequestStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "In progress", statuses: ["submitted", "under_review", "paid", "processing", "shipped"] },
  { key: "pay", label: "To pay", statuses: ["quote_sent"] },
  { key: "done", label: "Done", statuses: ["completed", "delivered"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "refunded", "cancelled"] },
];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "all" } = await searchParams;
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const supabase = await createClient();
  let q = supabase.from("requests").select("*").neq("status", "draft").order("created_at", { ascending: false }).limit(200);
  if (active.statuses) q = q.in("status", active.statuses);
  const { data } = await q;
  const requests = (data ?? []) as RequestRow[];

  return (
    <>
      <PageHeader title="My requests" description="Track every payment and purchase." actions={<Link href="/dashboard/requests/new" className="btn btn-dark btn-sm"><PlusCircle className="h-4 w-4" /> New request</Link>} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/dashboard/requests?filter=${f.key}`}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${f.key === active.key ? "bg-brand-900 text-white dark:bg-lime-400 dark:text-brand-950" : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {requests.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Requests you submit will appear here with live status updates." />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/requests/${r.id}`} className="card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{r.title}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{r.reference} · {formatDate(r.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="table">
              <thead><tr><th>Order</th><th>Request</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td><Link href={`/dashboard/requests/${r.id}`} className="font-semibold text-brand-700 hover:underline dark:text-lime-400">{r.reference}</Link></td>
                    <td className="max-w-xs truncate">{r.title}</td>
                    <td className="capitalize">{r.type}</td>
                    <td className="whitespace-nowrap">{r.amount ? formatMoney(r.amount, r.currency) : "-"}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
