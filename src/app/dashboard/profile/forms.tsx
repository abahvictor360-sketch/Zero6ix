"use client";
import { useActionState } from "react";
import { updateProfile, uploadKycDocument } from "../actions";
import { Field } from "@/components/ui";
import { FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function ProfileForm({ profile }: { profile: { full_name: string; address_line: string; city: string; state: string; notify_email: boolean; notify_whatsapp: boolean } }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Full name" name="full_name" error={fieldError(state, "full_name")}>
        <input id="full_name" name="full_name" className="input" defaultValue={profile.full_name} required />
      </Field>
      <Field label="Address" name="address_line"><input id="address_line" name="address_line" className="input" defaultValue={profile.address_line} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" name="city"><input id="city" name="city" className="input" defaultValue={profile.city} /></Field>
        <Field label="State" name="state"><input id="state" name="state" className="input" defaultValue={profile.state} /></Field>
      </div>
      <fieldset className="space-y-2 text-sm">
        <legend className="label">Notifications</legend>
        <label className="flex items-center gap-2"><input type="checkbox" name="notify_email" defaultChecked={profile.notify_email} className="rounded text-brand-700" /> Email updates</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="notify_whatsapp" defaultChecked={profile.notify_whatsapp} className="rounded text-brand-700" /> WhatsApp updates</label>
        <p className="hint">In-app notifications are always on.</p>
      </fieldset>
      <SubmitButton className="btn btn-dark btn-sm" pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}

export function KycUploadForm({ organisationId }: { organisationId?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(uploadKycDocument, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
      {organisationId && <input type="hidden" name="organisation_id" value={organisationId} />}
      <Field label="Document type" name="doc_type">
        <select id="doc_type" name="doc_type" className="input" defaultValue={organisationId ? "cac_certificate" : "national_id"}>
          {organisationId && <option value="cac_certificate">CAC certificate</option>}
          <option value="national_id">National ID (NIN slip/card)</option>
          <option value="passport">International passport</option>
          <option value="drivers_license">Driver&apos;s licence</option>
          <option value="voters_card">Voter&apos;s card</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Document number" name="doc_number"><input id="doc_number" name="doc_number" className="input" autoComplete="off" /></Field>
      <Field label="File (JPG, PNG, PDF · max 5MB)" name="document" error={fieldError(state, "document")}>
        <input id="document" name="document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required
          className="block w-full text-sm file:mr-2 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm dark:file:bg-white/10 dark:file:text-white" />
      </Field>
      <div className="sm:col-span-3"><SubmitButton className="btn btn-dark btn-sm" pendingText="Uploading…">Upload document</SubmitButton></div>
    </form>
  );
}
