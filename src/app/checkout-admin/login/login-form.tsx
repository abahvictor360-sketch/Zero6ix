"use client";
import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <ActionForm action={action} pending={pending} className="mt-5 space-y-4">
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-dark w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </ActionForm>
  );
}
