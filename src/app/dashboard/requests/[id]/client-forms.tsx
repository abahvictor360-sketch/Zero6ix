"use client";
import { useActionState, useEffect, useRef } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { saveCredentials, sendMessage } from "../../actions";
import { FormMessage, SubmitButton, fieldError } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function MessageForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(sendMessage, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="mt-4 space-y-2">
      <input type="hidden" name="request_id" value={requestId} />
      {state.error && <FormMessage state={state} />}
      <textarea name="body" rows={3} className="input" placeholder="Write a message…" required aria-label="Message" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Attach a file"
          className="text-xs file:mr-2 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs dark:file:bg-white/10 dark:file:text-white" />
        <SubmitButton className="btn btn-dark btn-sm" pendingText="Sending…"><Send className="h-3.5 w-3.5" /> Send</SubmitButton>
      </div>
    </form>
  );
}

export function CredentialsForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCredentials, {});
  return (
    <form action={action} className="space-y-3" autoComplete="off">
      <FormMessage state={state} />
      <input type="hidden" name="request_id" value={requestId} />
      <input name="username" className="input" placeholder="Login email / username" aria-label="Username" autoComplete="off" />
      {fieldError(state, "username") && <p className="field-error">{fieldError(state, "username")?.[0]}</p>}
      <input name="password" type="password" className="input" placeholder="Password" aria-label="Password" autoComplete="new-password" />
      <input name="extra" className="input" placeholder="2FA / backup code or notes (optional)" aria-label="Extra details" autoComplete="off" />
      <p className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Encrypted with AES-256. Only operations staff can view it, and every view is logged. Change your password once we&apos;re done.</p>
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Encrypting…">Save securely</SubmitButton>
    </form>
  );
}
