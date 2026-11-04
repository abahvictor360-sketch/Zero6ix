"use client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Send } from "lucide-react";
import { rejectRequest, revealCredentials, saveShipment, sendQuote, staffMessage, updateStatus, uploadProof } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import { computeQuote } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";
import { CURRENCIES, type ActionState } from "@/lib/validation";
import type { FeeSettings, RequestStatus, Shipment, ShippingRate } from "@/lib/types";

export function QuoteBuilder({
  requestId, type, flagged, defaults, rates, fees, shipping,
}: {
  requestId: string;
  type: "service" | "item";
  flagged: boolean;
  defaults: { amount: number; currency: string; origin: string; weight: number };
  rates: { currency: string; sell_rate: number; buy_rate: number }[];
  fees: FeeSettings;
  shipping: ShippingRate[];
}) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(sendQuote, {});
  const [amount, setAmount] = useState(String(defaults.amount || ""));
  const [currency, setCurrency] = useState(defaults.currency);
  const [rateOverride, setRateOverride] = useState("");
  const [weight, setWeight] = useState(String(defaults.weight || ""));
  const [origin, setOrigin] = useState(defaults.origin);
  const [other, setOther] = useState("");

  const rate = rates.find((r) => r.currency === currency);
  const sellRate = Number(rateOverride) > 0 ? Number(rateOverride) : rate?.sell_rate ?? 0;
  const preview = useMemo(() => {
    try {
      const ship = shipping.find((s) => s.origin_region === origin);
      const usd = rates.find((r) => r.currency === "USD");
      return computeQuote({
        amount: Number(amount), currency, sellRate, fees, otherFeesNgn: Number(other) || 0,
        shipping: type === "item" && Number(weight) > 0 && ship && usd ? { weightKg: Number(weight), rate: ship, usdSellRate: usd.sell_rate } : null,
      });
    } catch { return null; }
  }, [amount, currency, sellRate, weight, origin, other, type, fees, rates, shipping]);
  const margin = preview && rate ? preview.subtotalNgn - Number(amount) * rate.buy_rate : 0;

  return (
    <ActionForm action={action} pending={actionPending} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="request_id" value={requestId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vendor amount" name="foreign_amount" error={fieldError(state, "foreign_amount")}>
          <input id="foreign_amount" name="foreign_amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Currency" name="currency">
          <select id="currency" name="currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Rate override (₦)" name="exchange_rate" hint={`Current sell: ₦${rate?.sell_rate.toLocaleString("en-NG") ?? "—"}`}>
          <input id="exchange_rate" name="exchange_rate" className="input" inputMode="decimal" value={rateOverride} onChange={(e) => setRateOverride(e.target.value)} placeholder="Leave blank" />
        </Field>
        <Field label="Other fees (₦)" name="other_fees_ngn" hint="e.g. vendor tax, special handling">
          <input id="other_fees_ngn" name="other_fees_ngn" className="input" inputMode="decimal" value={other} onChange={(e) => setOther(e.target.value)} />
        </Field>
        {type === "item" && (
          <>
            <Field label="Shipping from" name="origin_region">
              <select id="origin_region" name="origin_region" className="input" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {shipping.map((s) => <option key={s.origin_region} value={s.origin_region}>{s.origin_region}</option>)}
              </select>
            </Field>
            <Field label="Weight (kg)" name="weight_kg">
              <input id="weight_kg" name="weight_kg" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
          </>
        )}
      </div>
      <Field label="Note to client (optional)" name="notes"><textarea id="notes" name="notes" rows={2} className="input" /></Field>
      {preview && (
        <dl className="space-y-1 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5">
          <Row k="Subtotal" v={formatMoney(preview.subtotalNgn)} />
          <Row k={`Service fee (${preview.serviceFeeRule})`} v={formatMoney(preview.serviceFeeNgn)} />
          {preview.shippingFeeNgn > 0 && <Row k="Shipping" v={formatMoney(preview.shippingFeeNgn)} />}
          {preview.otherFeesNgn > 0 && <Row k="Other" v={formatMoney(preview.otherFeesNgn)} />}
          <Row k={<strong>Total to client</strong>} v={<strong>{formatMoney(preview.totalNgn)}</strong>} />
          <Row k={<span className="text-xs text-slate-500">FX margin (internal)</span>} v={<span className={`text-xs ${margin < 0 ? "text-red-600" : "text-slate-500"}`}>{formatMoney(margin)}</span>} />
        </dl>
      )}
      {flagged && (
        <label className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          <input type="checkbox" name="override_flag" className="mt-0.5 rounded" /> I have reviewed the compliance flags and confirm this request is legal.
        </label>
      )}
      <SubmitButton className="btn btn-dark w-full" pendingText="Sending quote…"><Send className="h-4 w-4" /> Send quote & payment link</SubmitButton>
      <p className="hint">Rate locks for {fees.quote_validity_hours}h. Sending a new quote supersedes the previous one.</p>
    </ActionForm>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><dt>{k}</dt><dd className="tabular-nums">{v}</dd></div>;
}

export function StatusForm({ requestId, options }: { requestId: string; options: RequestStatus[] }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(updateStatus, {});
  if (!options.length) return <p className="muted text-sm">No further status changes available.</p>;
  return (
    <ActionForm action={action} pending={actionPending} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="request_id" value={requestId} />
      <select name="status" className="input" aria-label="New status">{options.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
      <textarea name="note" rows={2} className="input" placeholder="Note shown to client (optional)" aria-label="Note" />
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Updating…">Update status</SubmitButton>
    </ActionForm>
  );
}

export function RejectForm({ requestId }: { requestId: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(rejectRequest, {});
  return (
    <ActionForm action={action} pending={actionPending} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="request_id" value={requestId} />
      <textarea name="reason" rows={2} className="input" placeholder="Reason (sent to the client)" aria-label="Rejection reason" required />
      {fieldError(state, "reason") && <p className="field-error">{fieldError(state, "reason")?.[0]}</p>}
      <SubmitButton className="btn btn-danger btn-sm" pendingText="Rejecting…">Reject request</SubmitButton>
    </ActionForm>
  );
}

export function ProofForm({ requestId }: { requestId: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(uploadProof, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <ActionForm ref={ref} action={action} pending={actionPending} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="request_id" value={requestId} />
      <select name="kind" className="input" aria-label="Kind">
        <option value="receipt">Vendor receipt</option>
        <option value="proof_of_payment">Proof of payment</option>
        <option value="license_key">Licence / access details</option>
        <option value="screenshot">Screenshot</option>
        <option value="proof_of_delivery">Proof of delivery</option>
        <option value="invoice">Invoice</option>
        <option value="other">Other</option>
      </select>
      <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="File"
        className="block w-full text-sm file:mr-2 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 dark:file:bg-white/10 dark:file:text-white" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visible_to_client" defaultChecked className="rounded text-brand-700" /> Visible to client</label>
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Uploading…">Upload</SubmitButton>
    </ActionForm>
  );
}

export function ShipmentForm({ requestId, shipment }: { requestId: string; shipment: Shipment | null }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(saveShipment, {});
  return (
    <ActionForm action={action} pending={actionPending} className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><FormMessage state={state} /></div>
      <input type="hidden" name="request_id" value={requestId} />
      <select name="status" defaultValue={shipment?.status ?? "awaiting_purchase"} className="input col-span-2" aria-label="Shipment status">
        {["awaiting_purchase", "purchased", "at_warehouse", "in_transit", "customs", "out_for_delivery", "delivered", "exception"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>
      <input name="carrier" defaultValue={shipment?.carrier ?? ""} className="input" placeholder="Carrier" aria-label="Carrier" />
      <input name="tracking_number" defaultValue={shipment?.tracking_number ?? ""} className="input" placeholder="Tracking number" aria-label="Tracking number" />
      <input name="tracking_url" defaultValue={shipment?.tracking_url ?? ""} className="input col-span-2" placeholder="Tracking URL" aria-label="Tracking URL" />
      <input name="foreign_warehouse" defaultValue={shipment?.foreign_warehouse ?? ""} className="input col-span-2" placeholder="Foreign warehouse" aria-label="Warehouse" />
      <input name="estimated_delivery" type="date" defaultValue={shipment?.estimated_delivery ?? ""} className="input" aria-label="Estimated delivery" />
      <input name="weight_kg" inputMode="decimal" defaultValue={shipment?.weight_kg ?? ""} className="input" placeholder="Weight kg" aria-label="Weight" />
      <div className="col-span-2"><SubmitButton className="btn btn-outline btn-sm" pendingText="Saving…">Save shipment</SubmitButton></div>
    </ActionForm>
  );
}

export function StaffMessageForm({ requestId }: { requestId: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(staffMessage, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <ActionForm ref={ref} action={action} pending={actionPending} className="mt-4 space-y-2">
      {state.error && <FormMessage state={state} />}
      <input type="hidden" name="request_id" value={requestId} />
      <textarea name="body" rows={3} className="input" placeholder="Reply to client…" required aria-label="Message" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" className="rounded text-amber-600" /> Internal note (staff only)</label>
        <SubmitButton className="btn btn-dark btn-sm" pendingText="Sending…"><Send className="h-3.5 w-3.5" /> Send</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function RevealCredentials({ requestId }: { requestId: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(revealCredentials, {});
  const creds = state.data as { username: string; password: string; extra: string } | undefined;
  return creds ? (
    <dl className="space-y-2 rounded-2xl bg-amber-50 p-3 font-mono text-xs dark:bg-amber-950/30">
      <div><dt className="text-slate-500">Username</dt><dd className="select-all break-all">{creds.username}</dd></div>
      <div><dt className="text-slate-500">Password</dt><dd className="select-all break-all">{creds.password}</dd></div>
      {creds.extra && <div><dt className="text-slate-500">Extra</dt><dd className="select-all break-all">{creds.extra}</dd></div>}
      <p className="font-sans text-[11px] text-amber-700">This view has been recorded in the audit log.</p>
    </dl>
  ) : (
    <ActionForm action={action} pending={actionPending}>
      {state.error && <FormMessage state={state} />}
      <input type="hidden" name="request_id" value={requestId} />
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Decrypting…"><Eye className="h-3.5 w-3.5" /> Reveal (audited)</SubmitButton>
    </ActionForm>
  );
}
