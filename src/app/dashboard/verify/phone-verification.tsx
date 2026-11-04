"use client";
import { useActionState } from "react";
import Link from "next/link";
import { confirmPhoneVerification, sendPhoneVerification } from "../actions";
import { Field } from "@/components/ui";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function PhoneVerification({ defaultPhone }: { defaultPhone: string }) {
  const [sent, send, sendPending] = useActionState<ActionState, FormData>(sendPhoneVerification, {});
  const [verified, verify, verifyPending] = useActionState<ActionState, FormData>(confirmPhoneVerification, {});
  const phone = (verified.data?.phone ?? sent.data?.phone) as string | undefined;

  if (verified.ok) {
    return (
      <div className="space-y-3">
        <FormMessage state={verified} />
        <Link href="/dashboard/requests/new" className="btn btn-dark btn-sm">Submit your first request</Link>
      </div>
    );
  }
  if (!phone) {
    return (
      <ActionForm action={send} pending={sendPending} className="space-y-3">
        <FormMessage state={sent} />
        <Field label="Phone number" name="phone" error={fieldError(sent, "phone")}>
          <input id="phone" name="phone" type="tel" defaultValue={defaultPhone} className="input" placeholder="0803 123 4567" required />
        </Field>
        <SubmitButton className="btn btn-dark btn-sm" pendingText="Sending…">Send verification code</SubmitButton>
      </ActionForm>
    );
  }
  return (
    <ActionForm action={verify} pending={verifyPending} className="space-y-3">
      <FormMessage state={verified.error ? verified : sent} />
      <input type="hidden" name="phone" value={phone} />
      <Field label="6-digit code" name="token" error={fieldError(verified, "token")}>
        <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-xl tracking-[0.5em]" required />
      </Field>
      <SubmitButton className="btn btn-dark btn-sm" pendingText="Verifying…">Verify</SubmitButton>
    </ActionForm>
  );
}
