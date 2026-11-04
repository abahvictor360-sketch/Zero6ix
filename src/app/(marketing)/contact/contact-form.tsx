"use client";
import { useActionState, useEffect, useRef } from "react";
import { submitContact } from "./actions";
import { Field } from "@/components/ui";
import { FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function ContactForm() {
  const [state, action] = useActionState<ActionState, FormData>(submitContact, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="card grid gap-4 sm:grid-cols-2" encType="multipart/form-data">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Full name" name="name" required error={fieldError(state, "name")}>
        <input id="name" name="name" className="input" autoComplete="name" required />
      </Field>
      <Field label="Email" name="email" required error={fieldError(state, "email")}>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </Field>
      <Field label="Phone" name="phone" error={fieldError(state, "phone")}>
        <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" placeholder="0803 123 4567" />
      </Field>
      <Field label="Subject" name="subject" required error={fieldError(state, "subject")}>
        <input id="subject" name="subject" className="input" required />
      </Field>
      <Field label="Message" name="message" required error={fieldError(state, "message")} className="sm:col-span-2">
        <textarea id="message" name="message" rows={5} className="input" required />
      </Field>
      <Field label="Attachment (optional)" name="attachment" hint="JPG, PNG, WEBP or PDF, max 5MB" error={fieldError(state, "attachment")} className="sm:col-span-2">
        <input id="attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
      </Field>
      {/* Honeypot: hidden from humans */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="sm:col-span-2"><SubmitButton pendingText="Sending…">Send message</SubmitButton></div>
    </form>
  );
}
