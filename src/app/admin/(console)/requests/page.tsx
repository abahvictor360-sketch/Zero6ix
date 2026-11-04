import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState, PageHeader, Pill, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";
import type { RequestRow, RequestStatus } from "@/lib/types";

export const metadata = { title: "Requests" };

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; flagged?: string; q?: string; page?: string }> }) {
  await requireStaff("requests.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 30;
  const db = createAdminClient();
  let query = db.from("requests").select("*, users!requests_user_id_fkey(full_name, email)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (sp.status && sp.status in STATUS_LABELS) query = query.eq("status", sp.status);
  if (sp.type === "service" || sp.type === "item") query = query.eq("type", sp.type);
  if (sp.flagged === "1") query = query.eq("flagged", true);
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, "").slice(0, 60);
    query = query.or(`reference.ilike.%${q}%,title.ilike.%${q}%,contact_phone.ilike.%${q}%`);
  }
  const { data, count } = await query;
  const rows = (data ?? []) as (RequestRow & { users: { full_name: string | null; email: string | null } | null })[];
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/requests?${p.toString()}`;
  };

  return (
    <>
      <PageHeader title="Requests" description={`${count ?? 0} matching`} />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]" action="/admin/requests">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Search reference, title, phone…" aria-label="Search" />
        </div>
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className="input" aria-label="Type">
          <option value="">All types</option><option value="service">Service</option><option value="item">Item</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flagged" value="1" defaultChecked={sp.flagged === "1"} className="rounded text-brand-700" /> Flagged only</label>
        <button className="btn btn-dark">Filter</button>
      </form>

      {rows.length === 0 ? <EmptyState title="No requests match" /> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Ref</th><th>Request</th><th>Client</th><th>Amount</th><th>Status</th><th>Source</th><th>Created</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  <td><Link href={`/admin/requests/${r.id}`} className="font-semibold text-brand-700 hover:underline dark:text-lime-400">{r.reference}</Link></td>
                  <td className="max-w-[260px]">
                    <p className="truncate">{r.title}</p>
                    <div className="mt-0.5 flex gap-1">
                      <Pill>{r.type}</Pill>
                      {r.flagged && <Pill tone="red">Flagged</Pill>}
                      {r.requires_kyc && <Pill tone="amber">KYC</Pill>}
                    </div>
                  </td>
                  <td className="text-sm">{r.users?.full_name ?? r.contact_phone ?? "-"}<p className="text-xs text-slate-500">{r.users?.email}</p></td>
                  <td className="whitespace-nowrap">{r.amount ? formatMoney(r.amount, r.currency) : "-"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="capitalize">{r.source}</td>
                  <td className="whitespace-nowrap text-slate-500">{formatDate(r.created_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex justify-between text-sm">
        {page > 1 ? <Link className="btn btn-outline btn-sm" href={qs({ page: String(page - 1) })}>Previous</Link> : <span />}
        {(count ?? 0) > page * size && <Link className="btn btn-outline btn-sm" href={qs({ page: String(page + 1) })}>Next</Link>}
      </div>
    </>
  );
}
