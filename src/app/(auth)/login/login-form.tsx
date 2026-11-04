"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { sendLoginOtp, signIn, verifyLoginOtp } from "../actions";
import { Field } from "@/components/ui";
import { FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [state, action] = useActionState<ActionState, FormData>(signIn, {});
  const [otpState, otpAction] = useActionState<ActionState, FormData>(sendLoginOtp, {});
  const [verifyState, verifyAction] = useActionState<ActionState, FormData>(verifyLoginOtp, {});
  const phone = (verifyState.data?.phone ?? otpState.data?.phone) as string | undefined;

  return (
    <div>
      <div className="mb-6 inline-flex w-full rounded-full bg-slate-100 p-1 text-sm dark:bg-white/10" role="tablist">
        {(["email", "phone"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 font-medium ${mode === m ? "bg-white shadow dark:bg-brand-800" : "text-slate-500"}`}>
            {m === "email" ? "Email & password" : "Phone (SMS code)"}
          </button>
        ))}
      </div>

      {mode === "email" ? (
        <form action={action} className="space-y-4">
          <FormMessage state={state} />
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Email" name="email" error={fieldError(state, "email")}>
            <input id="email" name="email" type="email" autoComplete="email" className="input" required />
          </Field>
          <Field label="Password" name="password" error={fieldError(state, "password")}>
            <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
          </Field>
          <div className="flex justify-end text-sm">
            <Link href="/forgot-password" className="font-medium text-brand-700 hover:underline dark:text-lime-400">Forgot password?</Link>
          </div>
          <SubmitButton className="btn btn-dark w-full" pendingText="Signing in…">Log in</SubmitButton>
        </form>
      ) : !phone ? (
        <form action={otpAction} className="space-y-4">
          <FormMessage state={otpState} />
          <Field label="Phone number" name="phone" hint="Use the number verified on your account" error={fieldError(otpState, "phone")}>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" className="input" required />
          </Field>
          <SubmitButton className="btn btn-dark w-full" pendingText="Sending…">Send code</SubmitButton>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <FormMessage state={verifyState.error ? verifyState : otpState} />
          <input type="hidden" name="phone" value={phone} />
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label={`Enter the 6-digit code sent to ${phone}`} name="token" error={fieldError(verifyState, "token")}>
            <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-xl tracking-[0.5em]" required />
          </Field>
          <SubmitButton className="btn btn-dark w-full" pendingText="Verifying…">Verify & log in</SubmitButton>
        </form>
      )}
    </div>
  );
}
