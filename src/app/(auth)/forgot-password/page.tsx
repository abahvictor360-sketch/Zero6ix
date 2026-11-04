"use client";
import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "../actions";
import { Field } from "@/components/ui";
import { FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<ActionState, FormData>(forgotPassword, {});
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="muted mb-8 mt-2">We&apos;ll email you a secure link.</p>
      <form action={action} className="space-y-4">
        <FormMessage state={state} />
        <Field label="Email" name="email" error={fieldError(state, "email")}>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </Field>
        <SubmitButton className="btn btn-dark w-full" pendingText="Sending…">Send reset link</SubmitButton>
      </form>
      <p className="muted mt-8 text-center text-sm"><Link href="/login" className="font-semibold hover:underline">Back to log in</Link></p>
    </>
  );
}
