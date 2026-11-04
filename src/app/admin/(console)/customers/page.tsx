import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Pill } from "@/components/ui";
import { KycViewButton } from "@/components/admin/forms";
import { reviewKyc } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import type { Organisation, UserProfile } from "@/lib/types";

export const metadata = { title: "Customers & KYC" };
const KYC_TONE = { unverified: "slate", pending: "amber", verified: "green", rejected: "red" } as const;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; kyc?: string }> }) {
  const staff = await requireStaff("customers.view");
  const sp = await searchParams;
  const tab = sp.tab === "organisations" ? "organisations" : "individuals";
  const db = createAdminClient();

  const { data: pendingDocs } = await db.from("kyc_documents").select("*, users!kyc_documents_user_id_fkey(full_name, email), organisations(name)").eq("status", "pending").order("created_at");

  let users: UserProfile[] = [];
  let orgs: (Organisation & { organisation_members: { count: number }[] })[] = [];
  if (tab === "individuals") {
    let q = db.from("users").select("*").order("created_at", { ascending: false }).limit(100);
    if (sp.q) { const s = sp.q.replace(/[%,()]/g, ""); q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%,phone.ilike.%${s}%`); }
    if (sp.kyc && sp.kyc in KYC_TONE) q = q.eq("kyc_status", sp.kyc);
    users = ((await q).data ?? []) as UserProfile[];
  } else {
    let q = db.from("organisations").select("*, organisation_members(count)").order("created_at", { ascending: false }).limit(100);
    if (sp.q) q = q.ilike("name", `%${sp.q.replace(/[%,()]/g, "")}%`);
    orgs = ((await q).data ?? []) as typeof orgs;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Customers & KYC" />

      {can(staff.profile.role, "kyc.review") && !!pendingDocs?.length && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Pending ID reviews ({pendingDocs.length})</h2>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {pendingDocs.map((d) => {
              const u = d.users as { full_name: string | null; email: string | null } | null;
              const o = d.organisations as { name: string } | null;
              return (
                <li key={d.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <p className="font-medium">{o ? `${o.name} (org)` : u?.full_name} · <span className="capitalize">{d.doc_type.replace(/_/g, " ")}</span> {d.doc_number && `· ${d.doc_number}`}</p>
                    <p className="text-xs text-slate-500">{u?.email} · uploaded {formatDate(d.created_at, true)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <KycViewButton docId={d.id} />
                    <form action={reviewKyc} className="flex items-center gap-2">
                      <input type="hidden" name="doc_id" value={d.id} />
                      <input name="notes" className="input h-8 w-40 py-1 text-xs" placeholder="Note (optional)" aria-label="Review note" />
                      <button name="decision" value="approved" className="btn btn-dark btn-sm">Approve</button>
                      <button name="decision" value="rejected" className="btn btn-outline btn-sm text-red-600">Reject</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["individuals", "organisations"].map((t) => (
            <Link key={t} href={`/admin/customers?tab=${t}`} className={`btn btn-sm capitalize ${tab === t ? "btn-dark" : "btn-outline"}`}>{t}</Link>
          ))}
        </div>
        <form className="flex gap-2" action="/admin/customers">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={sp.q} className="input pl-9" placeholder="Search…" aria-label="Search" />
          </div>
          {tab === "individuals" && (
            <select name="kyc" defaultValue={sp.kyc ?? ""} className="input" aria-label="KYC status">
              <option value="">All KYC</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="unverified">Unverified</option><option value="rejected">Rejected</option>
            </select>
          )}
          <button className="btn btn-outline">Go</button>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        {tab === "individuals" ? (
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>KYC</th><th>Joined</th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name || "—"} {u.account_type === "organisation" && <Pill tone="blue">org</Pill>}</td>
                <td>{u.email} {u.email_verified && <span className="text-emerald-600">✓</span>}</td>
                <td>{u.phone ?? "—"} {u.phone_verified && <span className="text-emerald-600">✓</span>}</td>
                <td className="capitalize">{u.role.replace("_", " ")}</td>
                <td><Pill tone={KYC_TONE[u.kyc_status]}>{u.kyc_status}</Pill></td>
                <td className="whitespace-nowrap text-slate-500">{formatDate(u.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <table className="table">
            <thead><tr><th>Organisation</th><th>RC number</th><th>Email</th><th>Members</th><th>KYC</th><th>Created</th></tr></thead>
            <tbody>{orgs.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.name}</td><td>{o.rc_number ?? "—"}</td><td>{o.email ?? "—"}</td>
                <td>{o.organisation_members?.[0]?.count ?? 0}</td>
                <td><Pill tone={KYC_TONE[o.kyc_status]}>{o.kyc_status}</Pill></td>
                <td className="whitespace-nowrap text-slate-500">{formatDate(o.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
