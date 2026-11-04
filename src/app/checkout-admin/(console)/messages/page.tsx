import Link from "next/link";
import { Archive, Check, Mail, Phone, Reply, Trash2 } from "lucide-react";
import { listMessages, StoreError, type MessageRow, type MessageStatus } from "@/lib/payfx/admin-store";
import { site } from "@/lib/site";
import { Alert, EmptyState, PageHeader, Pill } from "@/components/ui";
import { deleteMessageAction, messageNoteAction, messageStatusAction } from "../../actions";
import { ConfirmForm } from "../confirm-form";
import { Flash } from "../flash";

export const metadata = { title: "Messages" };

const TONE: Record<MessageStatus, "red" | "slate" | "green" | "blue"> = { new: "red", read: "slate", replied: "green", archived: "blue" };
const FILTERS: { key: string; label: string }[] = [
  { key: "open", label: "Inbox" }, { key: "new", label: "New" }, { key: "replied", label: "Replied" }, { key: "archived", label: "Archived" }, { key: "all", label: "All" },
];

function StatusButton({ m, status, children, filter }: { m: MessageRow; status: MessageStatus; children: React.ReactNode; filter: string }) {
  return (
    <form action={messageStatusAction}>
      <input type="hidden" name="id" value={m.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return" value={`/messages?f=${filter}`} />
      <button className="btn btn-outline btn-sm">{children}</button>
    </form>
  );
}

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ f?: string; notice?: string; error?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.some((x) => x.key === sp.f) ? sp.f! : "open";
  let rows: MessageRow[] = [];
  let error = "";
  try {
    rows = await listMessages(f === "all" ? undefined : (f as MessageStatus | "open"));
  } catch (e) {
    error = e instanceof StoreError && (e.code === "42P01" || e.code === "PGRST205")
      ? "The messages table is missing. Run supabase/leadloop/checkout_admin.sql in the Supabase SQL editor (leadloop project)."
      : e instanceof StoreError ? e.message : "Could not load messages.";
  }

  return (
    <>
      <PageHeader title="Messages" description={`Contact form messages from ${site.url.replace(/^https?:\/\//, "")}/contact. Each one is also emailed to ${process.env.CONTACT_FORM_TO ?? site.email}.`} />
      <Flash notice={sp.notice} error={sp.error || error} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/checkout-admin/messages?f=${x.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${f === x.key ? "bg-brand-900 text-white dark:bg-lime-400 dark:text-brand-950" : "border border-slate-200 dark:border-white/10"}`}>{x.label}</Link>
        ))}
      </div>
      {!error && !rows.length ? (
        <EmptyState title="No messages here" description="New contact form messages will show up in the inbox." />
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => {
            const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}&body=${encodeURIComponent(`\n\n---\nOn ${new Date(m.created_at).toDateString()}, ${m.name} wrote:\n${m.message}`)}`;
            return (
              <li key={m.id} id={m.id} className="card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="break-words">{m.subject}</strong>
                      <Pill tone={TONE[m.status]}>{m.status[0].toUpperCase() + m.status.slice(1)}</Pill>
                      {m.enquiry && <Pill>{m.enquiry}</Pill>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {m.name} · <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
                      {m.phone && <> · <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a></>}
                      {m.country && <> · {m.country}</>}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{new Date(m.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{m.message}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={reply} className="btn btn-dark btn-sm"><Reply className="h-4 w-4" /> Reply by email</a>
                  {m.phone && <a href={`tel:${m.phone}`} className="btn btn-outline btn-sm"><Phone className="h-4 w-4" /> Call</a>}
                  {m.status === "new" && <StatusButton m={m} status="read" filter={f}><Check className="h-4 w-4" /> Mark read</StatusButton>}
                  {m.status !== "replied" && <StatusButton m={m} status="replied" filter={f}><Mail className="h-4 w-4" /> Mark replied</StatusButton>}
                  {m.status !== "archived" ? <StatusButton m={m} status="archived" filter={f}><Archive className="h-4 w-4" /> Archive</StatusButton>
                    : <StatusButton m={m} status="read" filter={f}>Move to inbox</StatusButton>}
                  <ConfirmForm action={deleteMessageAction} message="Delete this message for good?">
                    <input type="hidden" name="id" value={m.id} />
                    <button className="btn btn-sm border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" aria-label="Delete message"><Trash2 className="h-4 w-4" /></button>
                  </ConfirmForm>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-slate-500">{m.notes ? "Private note" : "Add a private note"}</summary>
                  <form action={messageNoteAction} className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="notes" defaultValue={m.notes ?? ""} className="input" maxLength={2000} placeholder="Only admins see this" aria-label="Private note" />
                    <button className="btn btn-outline btn-sm">Save</button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      {f === "open" && rows.length > 0 && <Alert tone="info" className="mt-6">Tip: after replying from your email, click <strong>Mark replied</strong> to keep the inbox tidy.</Alert>}
    </>
  );
}
