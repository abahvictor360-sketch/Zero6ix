import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; actor?: string; page?: string }> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 50;
  let q = createAdminClient().from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (sp.action) q = q.ilike("action", `${sp.action.replace(/[%,]/g, "")}%`);
  if (sp.actor) q = q.ilike("actor_email", `%${sp.actor.replace(/[%,]/g, "")}%`);
  const { data, count } = await q;
  return (
    <>
      <PageHeader title="Audit log" description="Every admin action and sensitive access. Records are append-only." />
      <form className="card mb-4 flex flex-wrap gap-2 p-4" action="/admin/audit">
        <input name="action" defaultValue={sp.action} className="input max-w-xs" placeholder="Action prefix, e.g. quote." aria-label="Action" />
        <input name="actor" defaultValue={sp.actor} className="input max-w-xs" placeholder="Actor email" aria-label="Actor" />
        <button className="btn btn-dark">Filter</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>{(data ?? []).map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap text-xs">{formatDate(a.created_at, true)}</td>
              <td className="text-xs">{a.actor_email ?? "system"}</td>
              <td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/10">{a.action}</code></td>
              <td className="text-xs">{a.entity_type === "request" && a.entity_id ? <Link href={`/admin/requests/${a.entity_id}`} className="underline">request</Link> : a.entity_type}{a.entity_id && a.entity_type !== "request" ? ` · ${a.entity_id}` : ""}</td>
              <td className="max-w-md"><pre className="max-h-24 overflow-auto whitespace-pre-wrap text-[11px] text-slate-500">{Object.keys(a.details ?? {}).length ? JSON.stringify(a.details) : ""}</pre></td>
              <td className="text-xs text-slate-500">{a.ip_address}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between">
        {page > 1 ? <Link className="btn btn-outline btn-sm" href={`/admin/audit?page=${page - 1}&action=${sp.action ?? ""}&actor=${sp.actor ?? ""}`}>Previous</Link> : <span />}
        {(count ?? 0) > page * size && <Link className="btn btn-outline btn-sm" href={`/admin/audit?page=${page + 1}&action=${sp.action ?? ""}&actor=${sp.actor ?? ""}`}>Next</Link>}
      </div>
    </>
  );
}
