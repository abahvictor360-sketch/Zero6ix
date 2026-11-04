"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import { Field } from "@/components/ui";
import { saveProductAction } from "../../actions";

export interface ProductFormValues {
  id?: string;
  name: string;
  subtitle: string;
  period: string;
  purpose: string;
  amount_ngn: string;
  logo: string;
  sort_order: string;
  active: boolean;
}

export function ProductForm({ values, logos }: { values: ProductFormValues; logos: { key: string; title: string; svg: string }[] }) {
  const [state, action, pending] = useActionState(saveProductAction, null);
  const err = (k: string) => fieldError(state, k);
  return (
    <ActionForm action={action} pending={pending} className="card space-y-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required error={err("name")}>
          <input id="name" name="name" className="input" defaultValue={values.name} placeholder="e.g. Google Maps API" required />
        </Field>
        <Field label="Subtitle" name="subtitle" error={err("subtitle")} hint="Optional, shown in brackets, e.g. Claude">
          <input id="subtitle" name="subtitle" className="input" defaultValue={values.subtitle} />
        </Field>
        <Field label="Amount (₦)" name="amount_ngn" required error={err("amount_ngn")}>
          <input id="amount_ngn" name="amount_ngn" className="input" inputMode="decimal" defaultValue={values.amount_ngn} placeholder="150000" required />
        </Field>
        <Field label="Period" name="period" required error={err("period")} hint="e.g. 12 months, 6 months, One time">
          <input id="period" name="period" className="input" defaultValue={values.period} list="periods" required />
          <datalist id="periods"><option value="One time" /><option value="1 month" /><option value="6 months" /><option value="12 months" /><option value="24 months" /></datalist>
        </Field>
      </div>
      <Field label="What it is for" name="purpose" required error={err("purpose")} hint="One or two sentences shown under the item and on the invoice.">
        <textarea id="purpose" name="purpose" className="input min-h-24" defaultValue={values.purpose} required maxLength={400} />
      </Field>

      <fieldset>
        <legend className="label">Logo <span className="text-red-500">*</span></legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {logos.map((l) => (
            <label key={l.key} className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-slate-200 p-3 text-center text-xs has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 dark:border-white/10 dark:has-[:checked]:border-lime-400 dark:has-[:checked]:bg-lime-400/10">
              <input type="radio" name="logo" value={l.key} defaultChecked={values.logo === l.key} className="sr-only" />
              <span dangerouslySetInnerHTML={{ __html: l.svg }} />
              {l.title}
            </label>
          ))}
        </div>
        {err("logo") && <p className="field-error">{err("logo")?.[0]}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display order" name="sort_order" error={err("sort_order")} hint="Lower numbers show first.">
          <input id="sort_order" name="sort_order" className="input" inputMode="numeric" defaultValue={values.sort_order} />
        </Field>
        <label className="flex items-center gap-3 self-center rounded-2xl border border-slate-200 p-3 text-sm dark:border-white/10">
          <input type="checkbox" name="active" defaultChecked={values.active} className="h-4 w-4 accent-brand-700" />
          <span><strong className="block">Show on checkout page</strong><span className="text-slate-500">Untick to hide without deleting.</span></span>
        </label>
      </div>

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Saving…">{values.id ? "Save changes" : "Add item"}</SubmitButton>
        <Link href="/checkout-admin/items" className="btn btn-outline">Cancel</Link>
      </div>
    </ActionForm>
  );
}
