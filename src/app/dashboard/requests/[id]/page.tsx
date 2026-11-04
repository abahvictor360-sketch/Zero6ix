import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, KeyRound, Truck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Alert, StatusBadge } from "@/components/ui";
import { QuoteCard } from "@/components/quote-card";
import { RequestTimeline } from "@/components/request-timeline";
import { MessageThread } from "@/components/message-thread";
import { CredentialsForm, MessageForm } from "./client-forms";
import { cancelRequest, deleteCredentials } from "../../actions";
import { formatDate, formatMoney } from "@/lib/format";
import { TERMINAL_STATUSES } from "@/lib/status";
import type { Attachment, Message, Quote, RequestEvent, RequestItem, RequestRow, Shipment } from "@/lib/types";

export default async function RequestDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser(`/dashboard/requests/${id}`);
  const supabase = await createClient();

  const { data: request } = await supabase.from("requests").select("*").eq("id", id).maybeSingle<RequestRow>();
  if (!request) notFound();

  const [items, quotes, events, attachments, shipment, messages, creds] = await Promise.all([
    supabase.from("request_items").select("*").eq("request_id", id).order("created_at"),
    supabase.from("quotes").select("*").eq("request_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("request_events").select("*").eq("request_id", id).order("created_at"),
    supabase.from("attachments").select("*").eq("request_id", id).order("created_at"),
    supabase.from("shipments").select("*").eq("request_id", id).maybeSingle(),
    supabase.from("messages").select("*").eq("request_id", id).order("created_at"),
    // Existence check only: ciphertext is never sent to the browser.
    createAdminClient().from("request_credentials").select("request_id, created_at").eq("request_id", id).maybeSingle(),
  ]);
  const quote = (quotes.data?.[0] ?? null) as Quote | null;
  const ship = shipment.data as Shipment | null;
  const files = (attachments.data ?? []) as Attachment[];
  const closed = TERMINAL_STATUSES.includes(request.status);
  const cancellable = ["submitted", "under_review", "quote_sent"].includes(request.status) && request.user_id === user.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/dashboard/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> All requests</Link>
      {created && <Alert tone="success">Request submitted! We&apos;ll review it and send your quote shortly. You&apos;ll get an email and WhatsApp message when it&apos;s ready.</Alert>}
      {request.requires_kyc && user.profile.kyc_status !== "verified" && (
        <Alert tone="warning">This order is above our ID-verification threshold. Please <Link href="/dashboard/profile#kyc" className="font-semibold underline">upload a valid ID</Link> so we can process payment.</Alert>
      )}
      {request.status === "rejected" && request.rejection_reason && <Alert tone="error"><strong>Not accepted:</strong> {request.rejection_reason}</Alert>}

      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-slate-500">{request.reference} · {request.type === "item" ? "Item purchase" : "Service payment"} · {formatDate(request.created_at, true)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{request.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.status} className="text-sm" />
          {cancellable && (
            <form action={cancelRequest}>
              <input type="hidden" name="request_id" value={request.id} />
              <button className="btn btn-outline btn-sm">Cancel</button>
            </form>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-4 font-semibold">Progress</h2>
            <RequestTimeline type={request.type} status={request.status} events={(events.data ?? []) as RequestEvent[]} />
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold">Request details</h2>
            {request.type === "service" ? (
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Service" value={request.service_name} />
                <Detail label="Website" value={request.website_url && <a href={request.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all underline">{request.website_url} <ExternalLink className="h-3 w-3" /></a>} />
                <Detail label="Amount" value={request.amount ? formatMoney(request.amount, request.currency) : null} />
                <Detail label="Account email" value={request.account_email} />
                <Detail label="Deadline" value={request.deadline ? formatDate(request.deadline) : null} />
              </dl>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {((items.data ?? []) as RequestItem[]).map((it) => (
                    <li key={it.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                      <div className="min-w-0">
                        <a href={it.product_url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium underline">{it.name || "Product link"}</a>
                        <p className="text-xs text-slate-500">{it.variant ? `${it.variant} · ` : ""}Qty {it.quantity}</p>
                      </div>
                      <span className="whitespace-nowrap">{it.estimated_price ? formatMoney(it.estimated_price, it.currency) : "-"}</span>
                    </li>
                  ))}
                </ul>
                {request.delivery_address && (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                    <strong>Deliver to:</strong> {request.delivery_address.line}, {request.delivery_address.city}, {request.delivery_address.state} · {request.delivery_address.phone}
                  </p>
                )}
              </>
            )}
            {request.notes && <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><strong>Notes:</strong> {request.notes}</p>}
          </section>

          <section className="card" id="messages">
            <h2 className="mb-4 font-semibold">Messages</h2>
            <MessageThread messages={(messages.data ?? []) as Message[]} viewer="client" attachmentNames={Object.fromEntries(files.map((f) => [f.id, f.file_name]))} />
            {!closed && <MessageForm requestId={request.id} />}
          </section>
        </div>

        <aside className="space-y-6">
          {quote ? (
            <QuoteCard quote={quote} canPay={request.status === "quote_sent"} />
          ) : !closed && (
            <section className="card-dark">
              <h2 className="font-semibold">Quote</h2>
              <p className="mt-2 text-sm text-white/70">We&apos;re reviewing your request. Your Naira quote will appear here, usually within an hour during business hours.</p>
            </section>
          )}

          {ship && (
            <section className="card">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Shipment</h2>
              <dl className="space-y-2 text-sm">
                <Detail label="Status" value={<span className="capitalize">{ship.status.replace(/_/g, " ")}</span>} />
                <Detail label="Carrier" value={ship.carrier} />
                <Detail label="Tracking number" value={ship.tracking_number} />
                <Detail label="Estimated delivery" value={ship.estimated_delivery ? formatDate(ship.estimated_delivery) : null} />
              </dl>
              {ship.tracking_url && <a href={ship.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm mt-4">Track with carrier <ExternalLink className="h-3.5 w-3.5" /></a>}
            </section>
          )}

          <section className="card">
            <h2 className="mb-3 font-semibold">Documents & proof</h2>
            {files.length ? (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id}>
                    <a href={`/api/attachments/${f.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                      <FileText className="h-4 w-4 text-brand-600 dark:text-lime-400" />
                      <span className="min-w-0 flex-1 truncate">{f.file_name}</span>
                      <span className="text-xs capitalize text-slate-400">{f.kind.replace(/_/g, " ")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="muted text-sm">Receipts, licence keys and proof of delivery will appear here.</p>}
          </section>

          {request.type === "service" && (
            <section className="card">
              <h2 className="mb-1 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" /> Account access</h2>
              <p className="muted mb-4 text-sm">Only if the service needs us to log in to your account.</p>
              {creds.data ? (
                <div className="space-y-3">
                  <p className="text-sm">🔒 Credentials saved (encrypted) on {formatDate(creds.data.created_at, true)}.</p>
                  <form action={deleteCredentials}>
                    <input type="hidden" name="request_id" value={request.id} />
                    <button className="btn btn-outline btn-sm text-red-600">Delete credentials</button>
                  </form>
                  {closed && <p className="text-xs text-amber-600">Your order is complete. We recommend deleting these and changing your password.</p>}
                </div>
              ) : closed ? <p className="muted text-sm">No credentials stored.</p> : <CredentialsForm requestId={request.id} />}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value || "-"}</dd>
    </div>
  );
}
