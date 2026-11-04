import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Pill } from "@/components/ui";
import { BulkRequestForm, CreateOrgForm, InviteForm } from "./forms";
import { KycUploadForm } from "../profile/forms";
import { removeMember } from "../actions";
import type { Organisation } from "@/lib/types";

export const metadata = { title: "Organisation" };

function lastMonths(n: number) {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({ value: m.toISOString().slice(0, 7), label: m.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) });
  }
  return out;
}

export default async function OrganisationPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const user = await requireUser("/dashboard/organisation");
  const { org: orgParam } = await searchParams;
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("organisation_members").select("organisation_id, role, organisations(*)")
    .eq("user_id", user.id).eq("status", "active");
  const list = (memberships ?? []).map((m) => ({ role: m.role as string, org: m.organisations as unknown as Organisation }));

  if (!list.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Organisation account" description="Schools, NGOs, startups and SMEs: add your team, submit bulk requests and download monthly statements." />
        <section className="card"><CreateOrgForm /></section>
      </div>
    );
  }

  const current = list.find((l) => l.org.id === orgParam) ?? list[0];
  const org = current.org;
  const isAdmin = ["owner", "admin"].includes(current.role);
  const { data: members } = await supabase
    .from("organisation_members").select("id, role, status, invited_email, user_id, users(full_name, email)")
    .eq("organisation_id", org.id).neq("status", "removed").order("created_at");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={org.name}
        description={[org.rc_number, org.email].filter(Boolean).join(" · ") || "Organisation account"}
        actions={list.length > 1 && (
          <div className="flex gap-2">{list.map((l) => (
            <Link key={l.org.id} href={`/dashboard/organisation?org=${l.org.id}`} className={`btn btn-sm ${l.org.id === org.id ? "btn-dark" : "btn-outline"}`}>{l.org.name}</Link>
          ))}</div>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Team members</h2>
            <Pill tone={org.kyc_status === "verified" ? "green" : org.kyc_status === "pending" ? "amber" : "slate"}>KYC: {org.kyc_status}</Pill>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {(members ?? []).map((m) => {
              const u = m.users as unknown as { full_name: string | null; email: string | null } | null;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u?.full_name || m.invited_email}</p>
                    <p className="truncate text-xs text-slate-500">{u?.email ?? m.invited_email} · <span className="capitalize">{m.role}</span>{m.status === "invited" && " · invited"}</p>
                  </div>
                  {isAdmin && m.role !== "owner" && m.user_id !== user.id && (
                    <form action={removeMember}>
                      <input type="hidden" name="organisation_id" value={org.id} />
                      <input type="hidden" name="member_id" value={m.id} />
                      <button className="text-xs text-red-600 hover:underline">Remove</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {isAdmin && <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/5"><InviteForm organisationId={org.id} /></div>}
        </section>

        <section className="card">
          <h2 className="font-semibold">Monthly statements</h2>
          <p className="muted mt-1 text-sm">All successful payments billed to {org.name}, per month (PDF).</p>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {lastMonths(12).map((m) => (
              <li key={m.value}>
                <a href={`/api/statements?org=${org.id}&month=${m.value}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                  {m.label} <Download className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" id="bulk">
        <h2 className="font-semibold">Bulk requests</h2>
        <p className="muted mt-1 text-sm">Submit up to 50 service payments at once. One per line: <code className="rounded bg-slate-100 px-1 dark:bg-white/10">Service, https://website, amount, currency, account email, notes</code></p>
        <div className="mt-4"><BulkRequestForm organisationId={org.id} /></div>
      </section>

      {isAdmin && org.kyc_status !== "verified" && (
        <section className="card">
          <h2 className="font-semibold">Organisation verification</h2>
          <p className="muted mt-1 text-sm">Upload your CAC certificate to unlock higher order limits for your organisation.</p>
          <div className="mt-4"><KycUploadForm organisationId={org.id} /></div>
        </section>
      )}
    </div>
  );
}
