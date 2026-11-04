import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Pill } from "@/components/ui";
import { RoleForm } from "@/components/admin/forms";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import type { UserProfile } from "@/lib/types";

export const metadata = { title: "Team & roles" };

const DESCRIPTIONS = {
  super_admin: "Everything, including fees, team roles and the audit log.",
  operations: "Review & approve requests, send quotes, update status, rates, KYC, credentials.",
  support: "View requests, message clients, contact forms and WhatsApp hand-offs.",
};

export default async function TeamPage() {
  await requireStaff("team.manage");
  const { data } = await createAdminClient().from("users").select("*").neq("role", "client").order("role");
  return (
    <div className="space-y-6">
      <PageHeader title="Team & roles" description="All staff must use two-factor authentication. Role changes are audit-logged." />
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(DESCRIPTIONS).map(([role, d]) => (
          <div key={role} className="card p-5">
            <p className="font-semibold">{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</p>
            <p className="muted mt-1 text-sm">{d}</p>
          </div>
        ))}
      </div>
      <section className="card">
        <h2 className="mb-3 font-semibold">Grant or change a role</h2>
        <RoleForm />
      </section>
      <section className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Since</th></tr></thead>
          <tbody>{((data ?? []) as UserProfile[]).map((u) => (
            <tr key={u.id}>
              <td className="font-medium">{u.full_name}</td><td>{u.email}</td>
              <td><Pill tone={u.role === "super_admin" ? "red" : u.role === "operations" ? "blue" : "slate"}>{ROLE_LABELS[u.role]}</Pill></td>
              <td>{formatDate(u.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  );
}
