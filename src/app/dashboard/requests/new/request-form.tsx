"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Package, Plus, Receipt, Trash2 } from "lucide-react";
import { submitItemRequest, submitServiceRequest } from "../../actions";
import { Field } from "@/components/ui";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import { CURRENCIES, type ActionState } from "@/lib/validation";

interface Props {
  initialType: "service" | "item";
  orgs: { id: string; name: string }[];
  shippingOrigins: { value: string; label: string }[];
  defaults: { email: string; address: string; city: string; state: string; phone: string };
}

function LegalCheckbox({ error }: { error?: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="legal_confirmed" required className="mt-0.5 rounded border-slate-400 text-brand-700" />
        <span>
          <strong>I confirm this request is legal and complies with Web Purchase&apos;s{" "}
          <Link href="/legal/terms" target="_blank" className="underline">Terms of Service</Link>.</strong>{" "}
          It is not on the <Link href="/legal/prohibited-items" target="_blank" className="underline">prohibited list</Link> and doesn&apos;t break the vendor&apos;s terms.
        </span>
      </label>
      {error && <p className="field-error">{error[0]}</p>}
    </div>
  );
}

function OrgSelect({ orgs }: { orgs: Props["orgs"] }) {
  if (!orgs.length) return null;
  return (
    <Field label="Bill to" name="organisation_id" hint="Organisation requests appear on the monthly statement">
      <select id="organisation_id" name="organisation_id" className="input" defaultValue="">
        <option value="">Myself (personal)</option>
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </Field>
  );
}

export function NewRequestForm({ initialType, orgs, shippingOrigins, defaults }: Props) {
  const [type, setType] = useState(initialType);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3" role="tablist">
        {([
          ["service", Receipt, "Pay for a service", "Subscriptions, exam & visa fees, domains…"],
          ["item", Package, "Buy an item", "From Amazon, eBay, AliExpress & more"],
        ] as const).map(([t, Icon, title, sub]) => (
          <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setType(t)}
            className={`rounded-3xl border p-4 text-left transition ${type === t ? "border-brand-700 bg-brand-900 text-white dark:border-lime-400" : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/5"}`}>
            <Icon className={`h-5 w-5 ${type === t ? "text-lime-400" : "text-brand-600"}`} />
            <p className="mt-2 font-semibold">{title}</p>
            <p className={`text-xs ${type === t ? "text-white/70" : "text-slate-500"}`}>{sub}</p>
          </button>
        ))}
      </div>
      {type === "service" ? <ServiceForm orgs={orgs} defaults={defaults} /> : <ItemForm orgs={orgs} defaults={defaults} shippingOrigins={shippingOrigins} />}
    </div>
  );
}

function ServiceForm({ orgs, defaults }: Pick<Props, "orgs" | "defaults">) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(submitServiceRequest, {});
  return (
    <ActionForm action={action} pending={actionPending} className="card space-y-5">
      <input type="hidden" name="type" value="service" />
      <FormMessage state={state} />
      <OrgSelect orgs={orgs} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name" name="service_name" required error={fieldError(state, "service_name")}>
          <input id="service_name" name="service_name" className="input" placeholder="e.g. Canva Pro annual" required />
        </Field>
        <Field label="Website URL" name="website_url" required error={fieldError(state, "website_url")}>
          <input id="website_url" name="website_url" type="url" className="input" placeholder="https://www.canva.com/pro" required />
        </Field>
        <Field label="Amount" name="amount" required error={fieldError(state, "amount")}>
          <input id="amount" name="amount" inputMode="decimal" className="input" placeholder="119.99" required />
        </Field>
        <Field label="Currency" name="currency" required error={fieldError(state, "currency")}>
          <select id="currency" name="currency" className="input" defaultValue="USD">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Account email to use" name="account_email" hint="The email on the account we should pay for" error={fieldError(state, "account_email")}>
          <input id="account_email" name="account_email" type="email" className="input" defaultValue={defaults.email} />
        </Field>
        <Field label="Deadline (optional)" name="deadline" error={fieldError(state, "deadline")}>
          <input id="deadline" name="deadline" type="date" className="input" min={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>
      <Field label="Notes" name="notes" hint="Plan, billing period, exam centre, application ID… Don't paste passwords here — you can add them securely after submitting." error={fieldError(state, "notes")}>
        <textarea id="notes" name="notes" rows={4} className="input" />
      </Field>
      <LegalCheckbox error={fieldError(state, "legal_confirmed")} />
      <SubmitButton className="btn btn-dark w-full sm:w-auto" pendingText="Submitting…">Submit request</SubmitButton>
    </ActionForm>
  );
}

function ItemForm({ orgs, defaults, shippingOrigins }: Pick<Props, "orgs" | "defaults" | "shippingOrigins">) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(submitItemRequest, {});
  const [rows, setRows] = useState([0]);
  const [nextId, setNextId] = useState(1);
  return (
    <ActionForm action={action} pending={actionPending} className="card space-y-5">
      <input type="hidden" name="type" value="item" />
      <FormMessage state={state} />
      <OrgSelect orgs={orgs} />

      <div className="space-y-3">
        <p className="label">Products</p>
        {fieldError(state, "items") && <p className="field-error">{fieldError(state, "items")?.[0]}</p>}
        {rows.map((id, idx) => (
          <div key={id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Item {idx + 1}</p>
              {rows.length > 1 && (
                <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setRows((r) => r.filter((x) => x !== id))} aria-label={`Remove item ${idx + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <input name="item_url" type="url" className="input" placeholder="https://www.amazon.com/dp/…" required aria-label="Product URL" />
                {fieldError(state, `items.${idx}.product_url`) && <p className="field-error">{fieldError(state, `items.${idx}.product_url`)?.[0]}</p>}
              </div>
              <input name="item_name" className="input sm:col-span-3" placeholder="Product name (optional)" aria-label="Product name" />
              <input name="item_variant" className="input sm:col-span-3" placeholder="Size / colour / variant" aria-label="Variant" />
              <input name="item_qty" type="number" min={1} defaultValue={1} className="input sm:col-span-2" aria-label="Quantity" />
              <input name="item_price" inputMode="decimal" className="input sm:col-span-4" placeholder="Estimated unit price" aria-label="Estimated price" />
            </div>
          </div>
        ))}
        {rows.length < 20 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setRows((r) => [...r, nextId]); setNextId((n) => n + 1); }}>
            <Plus className="h-4 w-4" /> Add another product
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price currency" name="currency" required>
          <select id="currency" name="currency" className="input" defaultValue="USD">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Store location" name="origin_region" hint="Where the store ships from">
          <select id="origin_region" name="origin_region" className="input">
            {shippingOrigins.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      <fieldset className="space-y-4">
        <legend className="label">Delivery address in Nigeria</legend>
        <Field label="Street address" name="address_line" required error={fieldError(state, "address_line")}>
          <input id="address_line" name="address_line" className="input" defaultValue={defaults.address} autoComplete="street-address" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="city" required error={fieldError(state, "city")}>
            <input id="city" name="city" className="input" defaultValue={defaults.city} autoComplete="address-level2" required />
          </Field>
          <Field label="State" name="state" required error={fieldError(state, "state")}>
            <input id="state" name="state" className="input" defaultValue={defaults.state} autoComplete="address-level1" required />
          </Field>
          <Field label="Recipient phone" name="delivery_phone" required error={fieldError(state, "delivery_phone")}>
            <input id="delivery_phone" name="delivery_phone" type="tel" className="input" defaultValue={defaults.phone} required />
          </Field>
        </div>
      </fieldset>

      <Field label="Notes" name="notes" error={fieldError(state, "notes")}>
        <textarea id="notes" name="notes" rows={3} className="input" placeholder="Anything else we should know?" />
      </Field>
      <LegalCheckbox error={fieldError(state, "legal_confirmed")} />
      <SubmitButton className="btn btn-dark w-full sm:w-auto" pendingText="Submitting…">Submit request</SubmitButton>
    </ActionForm>
  );
}
