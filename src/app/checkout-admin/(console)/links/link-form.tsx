"use client";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import { Field } from "@/components/ui";
import { createPaymentLinkAction } from "../../actions";

interface Item { id: string; label: string; period: string; amount: number; svg: string }

const fmt = (n: number, cur: "NGN" | "USD") =>
  `${cur === "NGN" ? "₦" : "US$"}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function LinkForm({ items, currencies, usdRate }: { items: Item[]; currencies: ("NGN" | "USD")[]; usdRate: number }) {
  const [state, action, pending] = useActionState(createPaymentLinkAction, null);
  const err = (k: string) => fieldError(state, k);
  const [picked, setPicked] = useState<string[]>([]);
  const [rows, setRows] = useState([{ key: 0, amount: "" }]);
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");

  const totalNgn = useMemo(() => {
    const fromItems = items.filter((i) => picked.includes(i.id)).reduce((s, i) => s + i.amount, 0);
    const fromCustom = rows.reduce((s, r) => s + (Number(r.amount.replace(/[₦,\s]/g, "")) || 0), 0);
    return fromItems + fromCustom;
  }, [items, picked, rows]);
  const total = currency === "NGN" ? totalNgn : Math.round((totalNgn / usdRate) * 100) / 100;

  return (
    <ActionForm action={action} pending={pending} className="space-y-6" noValidate>
      <section className="card space-y-4">
        <h2 className="font-semibold">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" required error={err("name")}>
            <input id="name" name="name" className="input" autoComplete="off" required />
          </Field>
          <Field label="Email" name="email" required error={err("email")} hint="Paystack sends the receipt here.">
            <input id="email" name="email" type="email" className="input" autoComplete="off" required />
          </Field>
          <Field label="Phone" name="phone" error={err("phone")}>
            <input id="phone" name="phone" type="tel" className="input" autoComplete="off" placeholder="Optional" />
          </Field>
          <Field label="Company" name="company" error={err("company")}>
            <input id="company" name="company" className="input" autoComplete="off" placeholder="Optional" />
          </Field>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">What they are paying for</h2>
          <p className="muted mt-1 text-sm">Pick checkout items, add custom amounts, or both. Amounts are in Naira.</p>
        </div>

        {items.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((i) => (
              <label key={i.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 dark:border-white/10 dark:has-[:checked]:border-lime-400 dark:has-[:checked]:bg-lime-400/10">
                <input type="checkbox" name="items" value={i.id} checked={picked.includes(i.id)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i.id] : p.filter((x) => x !== i.id)))} className="h-4 w-4 accent-brand-700" />
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-white/10" dangerouslySetInnerHTML={{ __html: i.svg }} />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.label}</span><span className="text-xs text-slate-500">{i.period}</span></span>
                <span className="shrink-0 font-semibold">{fmt(i.amount, "NGN")}</span>
              </label>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Custom amounts</p>
          {rows.map((r, n) => (
            <div key={r.key} className="grid gap-2 rounded-2xl border border-slate-200 p-3 dark:border-white/10 sm:grid-cols-[1fr_160px_130px_auto]">
              <div>
                <input name={`custom_desc_${n}`} className="input" placeholder="What it's for, e.g. WES evaluation fee" aria-label={`Description ${n + 1}`} maxLength={120} />
                {err(`custom_desc_${n}`) && <p className="field-error">{err(`custom_desc_${n}`)?.[0]}</p>}
              </div>
              <div>
                <input name={`custom_amount_${n}`} className="input" inputMode="decimal" placeholder="Amount (₦)" aria-label={`Amount ${n + 1} in Naira`}
                  value={r.amount} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, amount: e.target.value } : x)))} />
                {err(`custom_amount_${n}`) && <p className="field-error">{err(`custom_amount_${n}`)?.[0]}</p>}
              </div>
              <input name={`custom_period_${n}`} className="input" placeholder="One time" aria-label={`Period ${n + 1}`} list="link-periods" maxLength={40} />
              <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [{ key: Date.now(), amount: "" }]))}
                className="btn btn-outline btn-sm self-start" aria-label="Remove this line"><X className="h-4 w-4" /></button>
              <input name={`custom_note_${n}`} className="input sm:col-span-4" placeholder="Details shown on the invoice (optional)" aria-label={`Details ${n + 1}`} maxLength={300} />
            </div>
          ))}
          <datalist id="link-periods"><option value="One time" /><option value="1 month" /><option value="6 months" /><option value="12 months" /></datalist>
          {rows.length < 5 && (
            <button type="button" onClick={() => setRows((rs) => [...rs, { key: Date.now(), amount: "" }])} className="btn btn-outline btn-sm"><Plus className="h-4 w-4" /> Add another amount</button>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Link options</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" name="currency" hint={currencies.includes("USD") ? `US$ uses ₦${usdRate.toLocaleString("en-US")} per US$1.` : "Your Paystack account takes Naira."}>
            <select id="currency" name="currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value as "NGN" | "USD")}>
              {currencies.map((c) => <option key={c} value={c}>{c === "NGN" ? "Naira (₦)" : "US dollars (US$)"}</option>)}
            </select>
          </Field>
          <Field label="Link expires" name="expires_days">
            <select id="expires_days" name="expires_days" className="input" defaultValue="7">
              <option value="0">Never</option>
              <option value="1">After 1 day</option>
              <option value="3">After 3 days</option>
              <option value="7">After 7 days</option>
              <option value="14">After 14 days</option>
              <option value="30">After 30 days</option>
            </select>
          </Field>
        </div>
        <Field label="Message to the customer" name="message" error={err("message")} hint="Shown on the payment page and in the email.">
          <textarea id="message" name="message" className="input min-h-20" maxLength={500} placeholder="e.g. Payment for your UK visa fee as discussed." />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="send_email" defaultChecked className="h-4 w-4 accent-brand-700" />
          Email the link to the customer now
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-brand-950/95 sm:static sm:mx-0 sm:rounded-3xl sm:border sm:px-5">
        <FormMessage state={state} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Customer pays</p>
            <p className="text-xl font-bold">{fmt(total, currency)}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/checkout-admin/links" className="btn btn-outline">Cancel</Link>
            <SubmitButton pendingText="Creating…">Create payment link</SubmitButton>
          </div>
        </div>
      </div>
    </ActionForm>
  );
}
