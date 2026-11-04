import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Copy, ExternalLink, FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { Alert, Pill, StatusBadge } from "@/components/ui";
import { QuoteCard } from "@/components/quote-card";
import { RequestTimeline } from "@/components/request-timeline";
import { MessageThread } from "@/components/message-thread";
import { ProofForm, QuoteBuilder, RejectForm, RevealCredentials, ShipmentForm, StaffMessageForm, StatusForm } from "./admin-forms";
import { approveForReview } from "@/app/admin/actions";
import { allowedTransitions } from "@/lib/status";
import { absoluteUrl } from "@/lib/site";
import { formatDate, formatMoney } from "@/lib/format";
import type { Attachment, FeeSettings, Message, Payment, Quote, RequestEvent, RequestItem, RequestRow, Shipment, ShippingRate, UserProfile } from "@/lib/types";

export const metadata = { title: "Request" };

export default async function AdminRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("requests.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data: r } = await db.from("requests").select("*").eq("id", id).maybeSingle<RequestRow>();
  if (!r) notFound();

  const [items, quotes, events, files, ship, msgs, pays, creds, client, org, rates, fees, shipping] = await Promise.all([
    db.from("request_items").select("*").eq("request_id", id),
    db.from("quotes").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    db.from("request_events").select("*").eq("request_id", id).order("created_at"),
    db.from("attachments").select("*").eq("request_id", id).order("created_at"),
    db.from("shipments").select("*").eq("request_id", id).maybeSingle(),
    db.from("messages").select("*").eq("request_id", id).order("created_at"),
    db.from("payments").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    db.from("request_credentials").select("created_at").eq("request_id", id).maybeSingle(),
    r.user_id ? db.from("users").select("*").eq("id", r.user_id).maybeSingle() : Promise.resolve({ data: null }),
    r.organisation_id ? db.from("organisations").select("name, kyc_status").eq("id", r.organisation_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("exchange_rates").select("currency, sell_rate, buy_rate").eq("is_active", true),
    db.from("fee_settings").select("*").eq("id", 1).single(),
    db.from("shipping_rates").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const user = client.data as UserProfile | null;
  const organisation = org.data as { name: string; kyc_status: string } | null;
  const quoteList = (quotes.data ?? []) as Quote[];
  const latest = quoteList[0] ?? null;
  const itemRows = (items.data ?? []) as RequestItem[];
  const role = staff.profile.role;
  const manage = can(role, "requests.manage");
  const totalWeight = itemRows.reduce((s, i) => s + Number(i.weight_kg ?? 0) * i.quantity, 0) || Number((ship.data as Shipment | null)?.weight_kg ?? 0);
  const transitions = allowedTransitions(r.status, r.type).filter((s) => s !== "rejected");
  const kycOk = user?.kyc_status === "verified" || organisation?.kyc_status === "verified";

  return (
    <div className="space-y-6">
      <Link href="/admin/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Requests</Link>

      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-slate-500">{r.reference} · {r.type} · via {r.source} · {formatDate(r.created_at, true)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{r.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {r.legal_confirmed ? <Pill tone="green">Legal confirmed {formatDate(r.legal_confirmed_at)}</Pill> : <Pill tone="red">No legal confirmation</Pill>}
            {r.requires_kyc && <Pill tone={kycOk ? "green" : "amber"}>KYC {kycOk ? "verified" : "required"}</Pill>}
            {r.batch_id && <Pill tone="blue">Bulk batch</Pill>}
          </div>
        </div>
        <StatusBadge status={r.status} className="text-sm" />
      </header>

      {r.flagged && (
        <Alert tone="error">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Compliance flags</p>
          <ul className="mt-1 list-disc pl-6">{r.flag_reasons.map((f) => <li key={f}>{f}</li>)}</ul>
          <p className="mt-1 text-xs">Verify the request is legal before approving. Reject with a clear reason if not.</p>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-4 font-semibold">Details</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {r.type === "service" && (<>
                <D k="Service" v={r.service_name} />
                <D k="Website" v={r.website_url && <a href={r.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all underline">{r.website_url}<ExternalLink className="h-3 w-3" /></a>} />
                <D k="Account email" v={r.account_email} />
                <D k="Deadline" v={r.deadline && formatDate(r.deadline)} />
              </>)}
              <D k="Declared amount" v={r.amount ? formatMoney(r.amount, r.currency) : null} />
              {r.type === "item" && <D k="Ships from" v={r.origin_region} />}
              {r.delivery_address && <D k="Delivery" v={`${r.delivery_address.line}, ${r.delivery_address.city}, ${r.delivery_address.state} · ${r.delivery_address.phone}`} />}
            </dl>
            {itemRows.length > 0 && (
              <table className="table mt-4">
                <thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Est. price</th></tr></thead>
                <tbody>{itemRows.map((i) => (
                  <tr key={i.id}>
                    <td className="max-w-[260px]"><a href={i.product_url} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">{i.name || i.product_url}</a></td>
                    <td>{i.variant ?? "—"}</td><td>{i.quantity}</td><td>{i.estimated_price ? formatMoney(i.estimated_price, i.currency) : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {r.notes && <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5"><strong>Client notes:</strong> {r.notes}</p>}
            {r.rejection_reason && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm dark:bg-red-950/40"><strong>Rejection reason:</strong> {r.rejection_reason}</p>}
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold">Timeline</h2>
            <RequestTimeline type={r.type} status={r.status} events={(events.data ?? []) as RequestEvent[]} />
          </section>

          <section className="card">
            <h2 className="mb-4 font-semibold">Messages</h2>
            <MessageThread viewer="staff" messages={(msgs.data ?? []) as Message[]} attachmentNames={Object.fromEntries(((files.data ?? []) as Attachment[]).map((f) => [f.id, f.file_name]))} />
            {can(role, "requests.message") && <StaffMessageForm requestId={r.id} />}
          </section>

          {((pays.data ?? []) as Payment[]).length > 0 && (
            <section className="card overflow-x-auto">
              <h2 className="mb-4 font-semibold">Payments</h2>
              <table className="table">
                <thead><tr><th>Reference</th><th>Provider</th><th>Amount</th><th>Status</th><th>Paid</th><th /></tr></thead>
                <tbody>{((pays.data ?? []) as Payment[]).map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.reference}</td><td className="capitalize">{p.provider}</td>
                    <td>{formatMoney(p.amount_paid_ngn ?? p.amount_ngn)}</td>
                    <td><Pill tone={p.status === "success" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Pill></td>
                    <td>{formatDate(p.paid_at, true)}</td>
                    <td>{p.status === "success" && <a href={`/api/invoices/${p.id}?kind=receipt`} className="text-xs underline">Receipt</a>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card text-sm">
            <h2 className="mb-3 font-semibold">Client</h2>
            {user ? (
              <dl className="space-y-1.5">
                <D k="Name" v={user.full_name} />
                <D k="Email" v={<>{user.email} {user.email_verified && <Pill tone="green">✓</Pill>}</>} />
                <D k="Phone" v={<>{user.phone} {user.phone_verified && <Pill tone="green">✓</Pill>}</>} />
                <D k="KYC" v={<span className="capitalize">{user.kyc_status}</span>} />
                {organisation && <D k="Organisation" v={`${organisation.name} (KYC ${organisation.kyc_status})`} />}
              </dl>
            ) : (
              <dl className="space-y-1.5">
                <D k="WhatsApp" v={r.contact_phone} />
                <p className="text-xs text-slate-500">Guest/WhatsApp draft — no account linked yet. Ask the client to sign up with this number.</p>
              </dl>
            )}
          </section>

          {manage && ["submitted", "draft"].includes(r.status) && (
            <section className="card space-y-4">
              <h2 className="font-semibold">Review</h2>
              <form action={approveForReview}>
                <input type="hidden" name="request_id" value={r.id} />
                <button className="btn btn-dark w-full" disabled={r.status === "draft" && !r.legal_confirmed}>Approve — legal, start review</button>
              </form>
              <RejectForm requestId={r.id} />
            </section>
          )}

          {latest && <QuoteCard quote={latest} canPay={false} />}
          {latest?.status === "active" && (
            <p className="flex items-center gap-2 break-all rounded-2xl bg-slate-100 p-3 text-xs dark:bg-white/5"><Copy className="h-3.5 w-3.5 shrink-0" /> {absoluteUrl(`/pay/${latest.payment_token}`)}</p>
          )}

          {can(role, "quotes.send") && ["under_review", "quote_sent"].includes(r.status) && (
            <section className="card">
              <h2 className="mb-4 font-semibold">{latest ? "Re-issue quote" : "Build quote"}</h2>
              {r.requires_kyc && !kycOk && <Alert tone="warning" className="mb-4">Client KYC not verified — they won&apos;t be able to pay until their ID is approved.</Alert>}
              <QuoteBuilder
                requestId={r.id}
                type={r.type}
                flagged={r.flagged}
                defaults={{ amount: Number(latest?.foreign_amount ?? r.amount ?? 0), currency: latest?.currency ?? r.currency, origin: r.origin_region ?? "US", weight: totalWeight }}
                rates={(rates.data ?? []).map((x) => ({ currency: x.currency, sell_rate: Number(x.sell_rate), buy_rate: Number(x.buy_rate) }))}
                fees={fees.data as FeeSettings}
                shipping={(shipping.data ?? []) as ShippingRate[]}
              />
            </section>
          )}

          {manage && (
            <section className="card space-y-4">
              <h2 className="font-semibold">Update status</h2>
              <StatusForm requestId={r.id} options={transitions} />
              {["under_review", "quote_sent"].includes(r.status) && (
                <details><summary className="cursor-pointer text-sm text-red-600">Reject…</summary><div className="mt-3"><RejectForm requestId={r.id} /></div></details>
              )}
            </section>
          )}

          {r.type === "item" && manage && (
            <section className="card">
              <h2 className="mb-4 font-semibold">Shipment & tracking</h2>
              <ShipmentForm requestId={r.id} shipment={ship.data as Shipment | null} />
            </section>
          )}

          <section className="card">
            <h2 className="mb-3 font-semibold">Files & proof</h2>
            <ul className="mb-4 space-y-2">
              {((files.data ?? []) as Attachment[]).map((f) => (
                <li key={f.id}>
                  <a href={`/api/attachments/${f.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                    <FileText className="h-4 w-4" /> <span className="truncate">{f.file_name}</span>
                    <span className="text-xs text-slate-400">{f.kind.replace(/_/g, " ")}{!f.visible_to_client && " · hidden"}</span>
                  </a>
                </li>
              ))}
            </ul>
            {manage && <ProofForm requestId={r.id} />}
          </section>

          {r.type === "service" && can(role, "credentials.view") && (
            <section className="card">
              <h2 className="mb-3 font-semibold">Client credentials</h2>
              {creds.data ? <RevealCredentials requestId={r.id} /> : <p className="muted text-sm">None shared.</p>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function D({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>;
}
