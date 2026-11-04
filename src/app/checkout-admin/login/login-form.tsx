"use client";
import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { loginAction } from "../actions";

export function LoginForm({ passwordEnabled, emailEnabled }: { passwordEnabled: boolean; emailEnabled: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [usePassword, setUsePassword] = useState(!emailEnabled && passwordEnabled);

  if (state?.ok) {
    return (
      <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-sm dark:bg-lime-400/10">
        <MailCheck className="mb-2 h-6 w-6 text-brand-700 dark:text-lime-400" />
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{state.message}</p>
      </div>
    );
  }

  return (
    <ActionForm action={action} pending={pending} className="mt-5 space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required autoFocus />
      </div>
      {usePassword && (
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
      )}
      <FormMessage state={state} />
      <SubmitButton className="btn btn-dark w-full" pendingText={usePassword ? "Signing in…" : "Sending link…"}>
        {usePassword ? "Sign in" : "Email me a sign-in link"}
      </SubmitButton>
      {passwordEnabled && emailEnabled && (
        <button type="button" onClick={() => setUsePassword((v) => !v)} className="w-full text-center text-sm text-slate-500 hover:underline">
          {usePassword ? "Email me a link instead" : "Use a password instead"}
        </button>
      )}
    </ActionForm>
  );
}
