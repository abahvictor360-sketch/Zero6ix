"use client";
import { useActionState, useEffect, useRef, useTransition, useState } from "react";
import { ExternalLink, RefreshCw, Send } from "lucide-react";
import {
  addKeyword, getKycDocumentUrl, replyWhatsApp, saveFees, saveRate, saveShippingRate, setUserRole, syncRatesNow,
} from "@/app/admin/actions";
import { Alert, Field } from "@/components/ui";
import { FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";
import type { ExchangeRate, FeeSettings, ShippingRate } from "@/lib/types";

export function RateRowForm({ rate }: { rate?: ExchangeRate }) {
  const [state, action] = useActionState<ActionState, FormData>(saveRate, {});
  return (
    <form action={action} className="grid items-end gap-2 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:grid-cols-[80px_1fr_70px_1fr_1fr_110px_90px_auto_auto]">
      <div className="sm:col-span-9"><FormMessage state={state} /></div>
      <Field label="Code" name={`currency-${rate?.currency ?? "new"}`}>
        <input name="currency" defaultValue={rate?.currency} readOnly={!!rate} className="input uppercase" maxLength={3} required aria-label="Currency code" />
      </Field>
      <Field label="Name" name="name"><input name="name" defaultValue={rate?.name} className="input" required /></Field>
      <Field label="Symbol" name="symbol"><input name="symbol" defaultValue={rate?.symbol} className="input" /></Field>
      <Field label="Buy (₦)" name="buy_rate"><input name="buy_rate" defaultValue={rate?.buy_rate} inputMode="decimal" className="input" required /></Field>
      <Field label="Sell (₦)" name="sell_rate"><input name="sell_rate" defaultValue={rate?.sell_rate} inputMode="decimal" className="input" required /></Field>
      <Field label="Source" name="source">
        <select name="source" defaultValue={rate?.source ?? "manual"} className="input"><option value="manual">Manual</option><option value="api">API + markup</option></select>
      </Field>
      <Field label="Markup %" name="markup_percent"><input name="markup_percent" defaultValue={rate?.markup_percent ?? 3} inputMode="decimal" className="input" /></Field>
      <label className="flex items-center gap-1.5 pb-3 text-xs"><input type="checkbox" name="is_active" defaultChecked={rate?.is_active ?? true} className="rounded" /> Active</label>
      <SubmitButton className="btn btn-dark btn-sm mb-1" pendingText="…">Save</SubmitButton>
      {rate?.api_rate && <p className="hint sm:col-span-9">Market (API): ₦{Number(rate.api_rate).toLocaleString("en-NG")} · spread {(((Number(rate.sell_rate) - Number(rate.api_rate)) / Number(rate.api_rate)) * 100).toFixed(2)}%</p>}
    </form>
  );
}

export function SyncRatesButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => setResult(await syncRatesNow()))}>
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Pull from API now
      </button>
      {result && <FormMessage state={result} />}
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FeesForm({ fees }: { fees: FeeSettings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveFees, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Percentage fee (%)" name="percentage_fee" error={fieldError(state, "percentage_fee")}><input id="percentage_fee" name="percentage_fee" defaultValue={fees.percentage_fee} className="input" inputMode="decimal" /></Field>
      <Field label="Flat fee (₦)" name="flat_fee_ngn"><input id="flat_fee_ngn" name="flat_fee_ngn" defaultValue={fees.flat_fee_ngn} className="input" inputMode="decimal" /></Field>
      <Field label="Minimum fee (₦)" name="minimum_fee_ngn"><input id="minimum_fee_ngn" name="minimum_fee_ngn" defaultValue={fees.minimum_fee_ngn} className="input" inputMode="decimal" /></Field>
      <Field label="ID (KYC) threshold (₦)" name="kyc_threshold_ngn" hint="Orders at or above this need a verified ID"><input id="kyc_threshold_ngn" name="kyc_threshold_ngn" defaultValue={fees.kyc_threshold_ngn} className="input" inputMode="decimal" /></Field>
      <Field label="Quote validity (hours)" name="quote_validity_hours"><input id="quote_validity_hours" name="quote_validity_hours" type="number" min={1} max={168} defaultValue={fees.quote_validity_hours} className="input" /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="label">Business hours (WAT) — used for WhatsApp human hand-off</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {DAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-1"><input type="checkbox" name="bh_days" value={i} defaultChecked={fees.business_hours.days.includes(i)} className="rounded" /> {d}</label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <input name="bh_start" type="time" defaultValue={fees.business_hours.start} className="input" aria-label="Opens" />
          <input name="bh_end" type="time" defaultValue={fees.business_hours.end} className="input" aria-label="Closes" />
          <input name="bh_saturday_end" type="time" defaultValue={fees.business_hours.saturday_end} className="input" aria-label="Saturday closes" />
        </div>
        <p className="hint">Opens · Closes · Saturday closes</p>
      </fieldset>
      <div><SubmitButton pendingText="Saving…">Save fee settings</SubmitButton></div>
    </form>
  );
}

export function ShippingRateForm({ rate }: { rate?: ShippingRate }) {
  const [state, action] = useActionState<ActionState, FormData>(saveShippingRate, {});
  return (
    <form action={action} className="grid items-end gap-2 sm:grid-cols-[70px_1.5fr_1fr_1fr_80px_80px_auto_auto]">
      <div className="sm:col-span-8">{state.error && <FormMessage state={state} />}</div>
      <input name="origin_region" defaultValue={rate?.origin_region} readOnly={!!rate} className="input uppercase" placeholder="US" aria-label="Origin code" required />
      <input name="label" defaultValue={rate?.label} className="input" placeholder="United States → Nigeria" aria-label="Label" required />
      <input name="rate_per_kg_usd" defaultValue={rate?.rate_per_kg_usd} className="input" placeholder="$/kg" aria-label="Rate per kg USD" required />
      <input name="min_charge_usd" defaultValue={rate?.min_charge_usd} className="input" placeholder="Min $" aria-label="Minimum charge USD" required />
      <input name="delivery_days_min" defaultValue={rate?.delivery_days_min} className="input" placeholder="Min days" aria-label="Min days" required />
      <input name="delivery_days_max" defaultValue={rate?.delivery_days_max} className="input" placeholder="Max days" aria-label="Max days" required />
      <label className="flex items-center gap-1 pb-3 text-xs"><input type="checkbox" name="is_active" defaultChecked={rate?.is_active ?? true} className="rounded" /> Active</label>
      <SubmitButton className="btn btn-dark btn-sm mb-1" pendingText="…">{state.ok ? "Saved ✓" : "Save"}</SubmitButton>
    </form>
  );
}

export function KeywordForm() {
  const [state, action] = useActionState<ActionState, FormData>(addKeyword, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
      <div className="sm:col-span-4"><FormMessage state={state} /></div>
      <input name="keyword" className="input" placeholder="keyword or phrase" required aria-label="Keyword" />
      <input name="category" className="input" placeholder="category (e.g. weapons)" required aria-label="Category" />
      <select name="severity" className="input" aria-label="Severity"><option value="flag">Flag for review</option><option value="block">Block</option></select>
      <SubmitButton className="btn btn-dark" pendingText="…">Add</SubmitButton>
    </form>
  );
}

export function RoleForm() {
  const [state, action] = useActionState<ActionState, FormData>(setUserRole, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
      <input name="email" type="email" className="input" placeholder="user@email.com" required aria-label="Email" />
      <select name="role" className="input" aria-label="Role">
        <option value="support">Support</option><option value="operations">Operations</option><option value="super_admin">Super Admin</option><option value="client">Client (remove staff access)</option>
      </select>
      <SubmitButton className="btn btn-dark" pendingText="…">Set role</SubmitButton>
    </form>
  );
}

export function KycViewButton({ docId }: { docId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(getKycDocumentUrl, {});
  const url = state.data?.url as string | undefined;
  useEffect(() => { if (url) window.open(url, "_blank", "noopener,noreferrer"); }, [url]);
  return (
    <form action={action}>
      <input type="hidden" name="doc_id" value={docId} />
      <button className="inline-flex items-center gap-1 text-xs font-medium underline">View <ExternalLink className="h-3 w-3" /></button>
    </form>
  );
}

export function WhatsAppReplyForm({ conversationId, windowOpen }: { conversationId: string; windowOpen: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(replyWhatsApp, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  if (!windowOpen) return <Alert tone="warning">The 24-hour reply window has closed. The customer must message again before you can reply freely.</Alert>;
  return (
    <form ref={ref} action={action} className="flex gap-2">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input name="body" className="input" placeholder="Type a reply…" required aria-label="Reply" autoComplete="off" />
      <SubmitButton className="btn btn-dark" pendingText="…"><Send className="h-4 w-4" /></SubmitButton>
      {state.error && <p className="field-error">{state.error}</p>}
    </form>
  );
}
