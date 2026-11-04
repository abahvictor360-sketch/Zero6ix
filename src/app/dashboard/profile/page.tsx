import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFeeSettings } from "@/lib/settings";
import { PageHeader, Pill } from "@/components/ui";
import { KycUploadForm, ProfileForm } from "./forms";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Profile & KYC" };

const KYC_TONE = { unverified: "slate", pending: "amber", verified: "green", rejected: "red" } as const;

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const supabase = await createClient();
  const [{ data: docs }, fees] = await Promise.all([
    supabase.from("kyc_documents").select("id, doc_type, status, review_notes, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    getFeeSettings(),
  ]);
  const p = user.profile;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Profile & verification" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card">
          <h2 className="mb-4 font-semibold">Your details</h2>
          <ProfileForm profile={{ full_name: p.full_name ?? "", address_line: p.address_line ?? "", city: p.city ?? "", state: p.state ?? "", notify_email: p.notify_email, notify_whatsapp: p.notify_whatsapp }} />
        </section>
        <section className="card space-y-4">
          <h2 className="font-semibold">Verification status</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between"><span>Email ({p.email})</span><Pill tone={p.email_verified ? "green" : "amber"}>{p.email_verified ? "Verified" : "Pending"}</Pill></li>
            <li className="flex items-center justify-between">
              <span>Phone ({p.phone ?? "—"})</span>
              {p.phone_verified ? <Pill tone="green">Verified</Pill> : <Link href="/dashboard/verify" className="btn btn-dark btn-sm">Verify</Link>}
            </li>
            <li className="flex items-center justify-between"><span>Government ID</span><Pill tone={KYC_TONE[p.kyc_status]}>{p.kyc_status}</Pill></li>
          </ul>
          {p.kyc_status === "verified" && <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><BadgeCheck className="h-4 w-4" /> Fully verified — no order limits.</p>}
        </section>
      </div>

      <section className="card" id="kyc">
        <h2 className="font-semibold">ID verification</h2>
        <p className="muted mt-1 text-sm">Required for orders of {formatMoney(fees.kyc_threshold_ngn)} or more. Your document is stored privately and only reviewed by our compliance team.</p>
        {p.kyc_status !== "verified" && <div className="mt-5"><KycUploadForm /></div>}
        {!!docs?.length && (
          <table className="table mt-6">
            <thead><tr><th>Document</th><th>Uploaded</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="capitalize">{d.doc_type.replace(/_/g, " ")}</td>
                  <td>{formatDate(d.created_at)}</td>
                  <td><Pill tone={d.status === "approved" ? "green" : d.status === "rejected" ? "red" : "amber"}>{d.status}</Pill></td>
                  <td className="text-sm text-slate-500">{d.review_notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
