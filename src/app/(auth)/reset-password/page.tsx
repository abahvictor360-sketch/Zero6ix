"use client";
import { useActionState } from "react";
import { resetPassword } from "../actions";
import { Field } from "@/components/ui";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export default function ResetPasswordPage() {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(resetPassword, {});
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <ActionForm action={action} pending={actionPending} className="mt-8 space-y-4">
        <FormMessage state={state} />
        <Field label="New password" name="password" error={fieldError(state, "password")} hint="At least 10 characters with a letter and a number">
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm password" name="confirm" error={fieldError(state, "confirm")}>
          <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="btn btn-dark w-full" pendingText="Saving…">Update password</SubmitButton>
      </ActionForm>
    </>
  );
}
