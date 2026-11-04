"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signUp } from "../actions";
import { Field } from "@/components/ui";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function SignupForm() {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(signUp, {});
  const [type, setType] = useState<"individual" | "organisation">("individual");

  if (state.ok) {
    return (
      <div className="card text-center">
        <MailCheck className="mx-auto h-10 w-10 text-brand-600 dark:text-lime-400" />
        <h2 className="mt-4 text-xl font-semibold">Check your email</h2>
        <p className="muted mt-2 text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <ActionForm action={action} pending={actionPending} className="space-y-4">
      <FormMessage state={state} />
      <fieldset>
        <legend className="label">Account type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["individual", "organisation"] as const).map((t) => (
            <label key={t} className={`cursor-pointer rounded-2xl border px-4 py-3 text-sm ${type === t ? "border-brand-600 bg-brand-50 dark:border-lime-400 dark:bg-lime-400/10" : "border-slate-200 dark:border-white/10"}`}>
              <input type="radio" name="account_type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              <span className="font-semibold capitalize">{t}</span>
              <span className="muted block text-xs">{t === "individual" ? "For yourself" : "School, NGO, business"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {type === "organisation" && (
        <Field label="Organisation name" name="organisation_name" required error={fieldError(state, "organisation_name")}>
          <input id="organisation_name" name="organisation_name" className="input" autoComplete="organization" />
        </Field>
      )}
      <Field label="Full name" name="full_name" required error={fieldError(state, "full_name")}>
        <input id="full_name" name="full_name" className="input" autoComplete="name" required />
      </Field>
      <Field label="Email" name="email" required error={fieldError(state, "email")}>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>
      <Field label="Phone (WhatsApp preferred)" name="phone" required error={fieldError(state, "phone")} hint="We'll verify this number by SMS">
        <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" placeholder="0803 123 4567" required />
      </Field>
      <Field label="Password" name="password" required error={fieldError(state, "password")} hint="At least 10 characters with a letter and a number">
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={10} />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 rounded border-slate-300 text-brand-700" required />
        <span>I agree to the <Link href="/legal/terms" className="underline" target="_blank">Terms of Service</Link> and <Link href="/legal/privacy" className="underline" target="_blank">Privacy Policy</Link>, and understand that only legal requests are accepted.</span>
      </label>
      {fieldError(state, "terms") && <p className="field-error">{fieldError(state, "terms")?.[0]}</p>}
      <SubmitButton className="btn btn-dark w-full" pendingText="Creating account…">Create account</SubmitButton>
    </ActionForm>
  );
}
