"use client";
import { useActionState, useEffect, useRef } from "react";
import { createOrganisation, inviteMember, submitBulkRequests } from "../actions";
import { Alert, Field } from "@/components/ui";
import { ActionForm, SubmitButton, fieldError, FormMessage } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function CreateOrgForm() {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(createOrganisation, {});
  return (
    <ActionForm action={action} pending={actionPending} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Organisation name" name="name" required error={fieldError(state, "name")}><input id="name" name="name" className="input" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="RC / registration number" name="rc_number"><input id="rc_number" name="rc_number" className="input" /></Field>
        <Field label="Billing email" name="email" error={fieldError(state, "email")}><input id="email" name="email" type="email" className="input" /></Field>
        <Field label="Phone" name="phone"><input id="phone" name="phone" type="tel" className="input" /></Field>
        <Field label="Address" name="address"><input id="address" name="address" className="input" /></Field>
      </div>
      <SubmitButton pendingText="Creating…">Create organisation</SubmitButton>
    </ActionForm>
  );
}

export function InviteForm({ organisationId }: { organisationId: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(inviteMember, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <ActionForm ref={ref} action={action} pending={actionPending} className="space-y-2">
      <FormMessage state={state} />
      <input type="hidden" name="organisation_id" value={organisationId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="email" type="email" className="input" placeholder="colleague@company.com" required aria-label="Email" />
        <select name="role" className="input sm:w-32" aria-label="Role"><option value="member">Member</option><option value="admin">Admin</option></select>
        <SubmitButton className="btn btn-dark" pendingText="…">Invite</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function BulkRequestForm({ organisationId }: { organisationId: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(submitBulkRequests, {});
  return (
    <ActionForm action={action} pending={actionPending} className="space-y-3">
      {state.error && <Alert tone={state.ok ? "warning" : "error"}><pre className="whitespace-pre-wrap font-sans">{state.error}</pre></Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="organisation_id" value={organisationId} />
      <textarea name="lines" rows={6} className="input font-mono text-xs" required aria-label="Bulk requests"
        placeholder={"Canva Pro Teams, https://www.canva.com/teams, 300, USD, design@school.edu.ng, 5 seats\nZoom Pro, https://zoom.us/pricing, 149.90, USD, it@school.edu.ng\nMicrosoft 365 Business, https://www.microsoft.com/microsoft-365/business, 220, GBP, admin@school.edu.ng"} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="legal_confirmed" required className="mt-0.5 rounded text-brand-700" />
        I confirm all requests are legal and comply with Web Purchase&apos;s Terms of Service.
      </label>
      <SubmitButton className="btn btn-dark btn-sm" pendingText="Submitting…">Submit batch</SubmitButton>
    </ActionForm>
  );
}
