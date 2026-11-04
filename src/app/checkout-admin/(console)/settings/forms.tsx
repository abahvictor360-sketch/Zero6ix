"use client";
import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { saveRateAction, testEmailAction } from "../../actions";

export function RateForm({ current, source }: { current: number; source: string }) {
  const [state, action, pending] = useActionState(saveRateAction, null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-3">
      <label htmlFor="usd_rate" className="label">Naira per US$1</label>
      <div className="flex gap-2">
        <span className="grid place-items-center rounded-2xl border border-slate-200 px-3 text-sm font-semibold dark:border-white/10">₦</span>
        <input id="usd_rate" name="usd_rate" className="input" inputMode="decimal" defaultValue={current} required />
        <SubmitButton className="btn btn-dark shrink-0" pendingText="Saving…">Save</SubmitButton>
      </div>
      <p className="hint">Now: ₦{current.toLocaleString("en-US")} ({source}). Used for USD prices on the checkout page and new invoices.</p>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function TestEmailButton() {
  const [state, action, pending] = useActionState(testEmailAction, null);
  return (
    <ActionForm action={() => action()} pending={pending} className="space-y-2">
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Sending…">Send me a test email</SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}
