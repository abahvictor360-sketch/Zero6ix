import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, Mail, Phone, Receipt, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { getOrder } from "@/lib/payfx/store";
import { StoreError } from "@/lib/payfx/admin-store";
import { gatewayName, money } from "@/lib/payfx/catalog";
import { LOGOS, logoSvg } from "@/lib/payfx/icons";
import { documentNumber } from "@/lib/payfx/pdf";
import { Alert, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import {
  deleteOrderAction, emailCustomerAction, markPaidAction, markUnpaidAction, saveOrderNoteAction, verifyOrderAction,
} from "../../../actions";
import { ConfirmForm } from "../../confirm-form";
import { Flash } from "../../flash";

export const metadata = { title: "Order" };

const when = (s?: string) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) : "–");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

export default async function AdminOrderPage({ params, searchParams }: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [{ ref }, sp] = await Promise.all([params, searchParams]);
  let order;
  try {
    order = await getOrder(decodeURIComponent(ref));
  } catch (e) {
    return <Alert tone="error">{e instanceof StoreError || e instanceof Error ? e.message : "Could not load this order."}</Alert>;
  }
  if (!order) notFound();
  const paid = order.status === "paid";
  const pdf = (q: string) => `/checkout/invoice/${order.ref}/pdf?${q}`;

  return (
    <>
      <Link href="/checkout-admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Orders</Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Invoice {order.invoiceNumber}</h1>
            {paid ? <Pill tone="green">Paid</Pill> : <Pill tone="amber">Awaiting payment</Pill>}
          </div>
          <p className="muted mt-1 text-sm">Created {when(order.createdAt)}{paid ? ` · Paid ${when(order.paidAt)}` : ""}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold">{money(order.total, order.currency)}</p>
          {order.currency !== "NGN" && <p className="text-sm text-slate-500">{money(order.ngnTotal)} at ₦{order.rate.toLocaleString("en-US")}/US$1</p>}
        </div>
      </div>
      <Flash notice={sp.notice} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-semibold">Customer</h2>
            <dl className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
              <Row label="Name">{order.customer.name}</Row>
              <Row label="Email"><a className="text-brand-700 hover:underline dark:text-lime-400" href={`mailto:${order.customer.email}`}>{order.customer.email}</a></Row>
              {order.customer.phone && <Row label="Phone"><a className="hover:underline" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></Row>}
              {order.customer.company && <Row label="Company">{order.customer.company}</Row>}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Invoice ${order.invoiceNumber}`)}`} className="btn btn-outline btn-sm"><Mail className="h-4 w-4" /> Write email</a>
              {order.customer.phone && <a href={`tel:${order.customer.phone}`} className="btn btn-outline btn-sm"><Phone className="h-4 w-4" /> Call</a>}
              <Link href={`/checkout-admin/orders?q=${encodeURIComponent(order.customer.email)}`} className="btn btn-outline btn-sm">All orders from this customer</Link>
            </div>
          </section>

          <section className="card p-0">
            <h2 className="px-6 pt-5 font-semibold">Items</h2>
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
              {order.items.map((l, i) => (
                <li key={l.id} className="flex items-start gap-3 px-6 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-white/10" dangerouslySetInnerHTML={{ __html: logoSvg(l.logo in LOGOS ? l.logo : "other", { size: 20 }) }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.name}{l.subtitle ? <span className="text-slate-500"> ({l.subtitle})</span> : null}</p>
                    <p className="text-xs text-slate-500">{l.period}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <a className="text-brand-700 hover:underline dark:text-lime-400" href={pdf(`doc=invoice&brand=item&item=${encodeURIComponent(l.id)}`)}>Item invoice {documentNumber(order, "invoice", i)}</a>
                      {paid && <a className="text-brand-700 hover:underline dark:text-lime-400" href={pdf(`doc=receipt&brand=item&item=${encodeURIComponent(l.id)}`)}>Item receipt</a>}
                    </div>
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    {money(l.amount, order.currency)}
                    {order.currency !== "NGN" && <span className="block text-xs font-normal text-slate-500">{money(l.ngnAmount)}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-slate-100 px-6 py-4 font-semibold dark:border-white/10">
              <span>Total</span><span>{money(order.total, order.currency)}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="font-semibold">Payment</h2>
            <dl className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
              <Row label="Gateway">{gatewayName(order.gateway)}</Row>
              <Row label="Currency">{order.currency}</Row>
              <Row label="Payment reference"><code className="text-xs">{order.paidRef || order.payRef}</code></Row>
              {order.attempts ? <Row label="Payment attempts">{order.attempts + 1}</Row> : null}
              {order.transactionId && <Row label="Transaction ID"><code className="text-xs">{order.transactionId}</code></Row>}
              {order.channel && <Row label="Paid with">{order.channel}</Row>}
              {order.manualPayment && <Row label="Recorded by">{order.manualPayment.by}{order.manualPayment.note ? ` · ${order.manualPayment.note}` : ""}</Row>}
              {order.source && <Row label="Created on">{order.source}</Row>}
              <Row label="Order ref"><code className="text-xs">{order.ref}</code></Row>
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="font-semibold">Documents</h2>
            <div className="mt-3 grid gap-2">
              <a href={`/checkout/invoice/${order.ref}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm justify-start"><ExternalLink className="h-4 w-4" /> Customer invoice page</a>
              <a href={pdf("doc=invoice&brand=webpurchase")} className="btn btn-outline btn-sm justify-start"><FileText className="h-4 w-4" /> Invoice PDF</a>
              {paid && <a href={pdf("doc=receipt&brand=webpurchase")} className="btn btn-outline btn-sm justify-start"><Download className="h-4 w-4" /> Receipt PDF</a>}
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">Actions</h2>
            {!paid && (
              <form action={verifyOrderAction}>
                <input type="hidden" name="ref" value={order.ref} />
                <SubmitButton className="btn btn-dark btn-sm w-full" pendingText="Checking…"><RefreshCw className="h-4 w-4" /> Check payment with {gatewayName(order.gateway)}</SubmitButton>
              </form>
            )}
            <form action={emailCustomerAction}>
              <input type="hidden" name="ref" value={order.ref} />
              <input type="hidden" name="kind" value={paid ? "receipt" : "invoice"} />
              <SubmitButton className="btn btn-outline btn-sm w-full" pendingText="Sending…">
                {paid ? <><Receipt className="h-4 w-4" /> Email receipt to customer</> : <><Mail className="h-4 w-4" /> Email invoice to customer</>}
              </SubmitButton>
            </form>
            {paid && (
              <ConfirmForm action={markUnpaidAction} message="Set this order back to unpaid? Only do this if it was marked paid by mistake.">
                <input type="hidden" name="ref" value={order.ref} />
                <button className="btn btn-outline btn-sm w-full"><Undo2 className="h-4 w-4" /> Set back to unpaid</button>
              </ConfirmForm>
            )}
          </section>

          {!paid && (
            <section className="card">
              <h2 className="font-semibold">Record a payment</h2>
              <p className="mt-1 text-xs text-slate-500">If the customer paid outside the gateway, e.g. by bank transfer.</p>
              <ConfirmForm action={markPaidAction} message="Mark this order as paid? The customer's receipt becomes available." className="mt-3 space-y-3">
                <input type="hidden" name="ref" value={order.ref} />
                <select name="method" className="input" defaultValue="bank_transfer" aria-label="Payment method">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                  <option value="other">Other</option>
                </select>
                <input name="reference" className="input" placeholder="Bank reference (optional)" maxLength={120} />
                <input name="note" className="input" placeholder="Note (optional)" maxLength={500} />
                <button className="btn btn-dark btn-sm w-full">Mark as paid</button>
              </ConfirmForm>
            </section>
          )}

          <section className="card">
            <h2 className="font-semibold">Private note</h2>
            <form action={saveOrderNoteAction} className="mt-3 space-y-2">
              <input type="hidden" name="ref" value={order.ref} />
              <textarea name="note" className="input min-h-20" defaultValue={order.adminNote ?? ""} placeholder="Only admins see this" maxLength={2000} aria-label="Private note" />
              <SubmitButton className="btn btn-outline btn-sm" pendingText="Saving…">Save note</SubmitButton>
            </form>
          </section>

          {!paid && (
            <ConfirmForm action={deleteOrderAction} message={`Delete invoice ${order.invoiceNumber}? The customer's invoice link will stop working. This cannot be undone.`}>
              <input type="hidden" name="ref" value={order.ref} />
              <button className="btn btn-sm w-full border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /> Delete unpaid order</button>
            </ConfirmForm>
          )}
        </aside>
      </div>
    </>
  );
}
