"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Paperclip, Send } from "lucide-react";
import { submitContact } from "./actions";
import { Field } from "@/components/ui";
import { ActionForm, FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

const ENQUIRIES = [
  { value: "service", label: "Pay for a service", hint: "Subscriptions, exam, visa & application fees" },
  { value: "item", label: "Buy an item", hint: "From Amazon, eBay, AliExpress & more" },
  { value: "business", label: "Business / bulk", hint: "Teams, schools, NGOs, SMEs" },
  { value: "other", label: "Something else", hint: "Questions, partnerships, support" },
] as const;

export function ContactForm({ email }: { email: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(submitContact, {});
  const [enquiry, setEnquiry] = useState<string>("service");
  const [fileName, setFileName] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setFileName(null);
      setDone(true);
    }
    // No server-side delivery configured yet: open the visitor's email app with the message pre-filled.
    if (state.data?.fallback === "mailto" && ref.current) {
      const f = new FormData(ref.current);
      const label = ENQUIRIES.find((e) => e.value === f.get("enquiry"))?.label ?? "Enquiry";
      const body = [
        `Name: ${f.get("name")}`,
        `Email: ${f.get("email")}`,
        f.get("phone") ? `Phone: ${f.get("phone")}` : "",
        f.get("country") ? `Country: ${f.get("country")}` : "",
        `Enquiry: ${label}`,
        "",
        String(f.get("message") ?? ""),
      ].filter((l) => l !== "").join("\n");
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`${label}: ${f.get("subject")}`)}&body=${encodeURIComponent(body)}`;
      setDone(true);
    }
  }, [state, email]);

  if (done) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-lime-400/25 text-brand-700 dark:text-lime-400"><CheckCircle2 className="h-7 w-7" /></span>
        <h2 className="text-xl font-semibold">Thank you — we&apos;ve got it</h2>
        <p className="muted max-w-sm text-sm">
          {state.ok ? state.message : `Your email app should have opened with your message. If it didn't, email us at ${email}.`}
        </p>
        <button type="button" onClick={() => setDone(false)} className="btn btn-outline btn-sm mt-2">Send another message</button>
      </div>
    );
  }

  return (
    <ActionForm ref={ref} action={action} pending={actionPending} className="card space-y-5 p-6 sm:p-8" encType="multipart/form-data">
      <div>
        <h2 className="text-xl font-semibold">Send us a message</h2>
        <p className="muted mt-1 text-sm">Tell us what you need — include links, amounts and currency — and we&apos;ll reply with a clear quote, usually within a few hours on business days.</p>
      </div>
      {state.error && <FormMessage state={state} />}

      <fieldset>
        <legend className="label">What can we help with?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENQUIRIES.map((e) => (
            <label key={e.value}
              className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${enquiry === e.value ? "border-brand-700 bg-brand-50 ring-1 ring-brand-700 dark:border-lime-400 dark:bg-lime-400/10 dark:ring-lime-400" : "border-slate-200 hover:border-slate-300 dark:border-white/10"}`}>
              <input type="radio" name="enquiry" value={e.value} checked={enquiry === e.value} onChange={() => setEnquiry(e.value)} className="sr-only" />
              <span className="block text-sm font-semibold">{e.label}</span>
              <span className="block text-xs text-slate-500">{e.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" required error={fieldError(state, "name")}>
          <input id="name" name="name" className="input" autoComplete="name" required />
        </Field>
        <Field label="Email" name="email" required error={fieldError(state, "email")}>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </Field>
        <Field label="Phone / WhatsApp" name="phone" error={fieldError(state, "phone")}>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" placeholder="+234 803 123 4567" />
        </Field>
        <Field label="Country you're in" name="country" error={fieldError(state, "country")}>
          <input id="country" name="country" className="input" autoComplete="country-name" placeholder="e.g. Nigeria, Ghana, UK" />
        </Field>
      </div>
      <Field label="Subject" name="subject" required error={fieldError(state, "subject")}>
        <input id="subject" name="subject" className="input" placeholder="e.g. Pay my IELTS fee" required />
      </Field>
      <Field label="Message" name="message" required error={fieldError(state, "message")}>
        <textarea id="message" name="message" rows={5} className="input" required
          placeholder="Paste the website or product link, the amount and currency, and any deadline." />
      </Field>

      <div>
        <label htmlFor="attachment" className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5">
          <Paperclip className="h-4 w-4 text-slate-500" />
          <span className="flex-1 truncate">{fileName ?? "Attach a screenshot or invoice (optional)"}</span>
          <span className="text-xs text-slate-400">JPG, PNG, PDF · 5MB</span>
        </label>
        <input id="attachment" name="attachment" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        {fieldError(state, "attachment") && <p className="field-error">{fieldError(state, "attachment")?.[0]}</p>}
      </div>

      {/* Honeypot: hidden from humans */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">By sending, you agree to our <a href="/legal/privacy" className="underline">Privacy Policy</a>. Legal requests only.</p>
        <SubmitButton className="btn btn-dark" pendingText="Sending…"><Send className="h-4 w-4" /> Send message</SubmitButton>
      </div>
    </ActionForm>
  );
}
