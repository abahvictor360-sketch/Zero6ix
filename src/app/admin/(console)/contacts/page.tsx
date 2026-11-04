import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { updateContactStatus } from "@/app/admin/actions";
import { signedUrl } from "@/lib/storage";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Contact forms" };
const TONE = { new: "blue", in_progress: "amber", resolved: "green", spam: "slate" } as const;

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("contacts.view");
  const { status } = await searchParams;
  let q = createAdminClient().from("contact_submissions").select("*").order("created_at", { ascending: false }).limit(100);
  if (status && status in TONE) q = q.eq("status", status);
  const { data } = await q;
  const rows = await Promise.all((data ?? []).map(async (c) => ({ ...c, url: c.attachment_path ? await signedUrl("contact", c.attachment_path, 600) : null })));

  return (
    <>
      <PageHeader title="Contact form submissions" />
      {!rows.length ? <EmptyState title="No messages" /> : (
        <ul className="space-y-4">
          {rows.map((c) => (
            <li key={c.id} id={c.id} className="card scroll-mt-24">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.subject}</p>
                  <p className="text-sm text-slate-500">{c.name} · <a href={`mailto:${c.email}`} className="underline">{c.email}</a>{c.phone && ` · ${c.phone}`} · {formatDate(c.created_at, true)}</p>
                </div>
                <Pill tone={TONE[c.status as keyof typeof TONE]}>{c.status.replace("_", " ")}</Pill>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{c.message}</p>
              {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline">View attachment</a>}
              <form action={updateContactStatus} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={c.id} />
                {(["in_progress", "resolved", "spam"] as const).filter((s) => s !== c.status).map((s) => (
                  <button key={s} name="status" value={s} className="btn btn-outline btn-sm capitalize">{s.replace("_", " ")}</button>
                ))}
                <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject)}`} className="btn btn-dark btn-sm">Reply by email</a>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
