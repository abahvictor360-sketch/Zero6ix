"use client";
import { useActionState, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { startPayment } from "./actions";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/validation";

export function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left <= 0) return <span className="font-semibold text-red-600">expired. Refresh the page</span>;
  const h = Math.floor(left / 3600_000);
  const m = Math.floor((left % 3600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return <span className="font-semibold tabular-nums">{h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s</span>;
}

export function PayForm({ token, total }: { token: string; total: string }) {
  const [state, action, actionPending] = useActionState<ActionState, FormData>(startPayment, {});
  const [provider, setProvider] = useState<"paystack" | "flutterwave">("paystack");
  return (
    <ActionForm action={action} pending={actionPending} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <fieldset>
        <legend className="label">Pay with</legend>
        <div className="grid grid-cols-2 gap-3">
          {([["paystack", "Paystack", "Card · Transfer · USSD"], ["flutterwave", "Flutterwave", "Card · Transfer · USSD"]] as const).map(([v, name, sub]) => (
            <label key={v} className={`cursor-pointer rounded-2xl border p-4 ${provider === v ? "border-brand-700 bg-brand-50 dark:border-lime-400 dark:bg-lime-400/10" : "border-slate-200 dark:border-white/10"}`}>
              <input type="radio" name="provider" value={v} checked={provider === v} onChange={() => setProvider(v)} className="sr-only" />
              <span className="block font-semibold">{name}</span>
              <span className="text-xs text-slate-500">{sub}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton className="btn btn-dark btn-lg w-full" pendingText="Redirecting to secure checkout…"><Lock className="h-4 w-4" /> Pay {total}</SubmitButton>
      <p className="text-center text-xs text-slate-500">You&apos;ll be redirected to {provider === "paystack" ? "Paystack" : "Flutterwave"}&apos;s secure page. We never see or store your card details.</p>
    </ActionForm>
  );
}
