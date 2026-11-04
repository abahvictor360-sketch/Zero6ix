"use client";
import { useActionState, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { RateInfo } from "@/lib/payfx/settings";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { refreshRateAction, saveRateAction, testEmailAction } from "../../actions";

const fmtN = (n: number) => `₦${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function RateForm({ info }: { info: RateInfo }) {
  const [state, action, pending] = useActionState(saveRateAction, null);
  const [mode, setMode] = useState<RateInfo["mode"]>(info.mode);
  const [markup, setMarkup] = useState(String(info.markup));
  const m = Number(markup);
  const preview = info.market && Number.isFinite(m) ? Math.round(info.market * (1 + m / 100) * 100) / 100 : null;
  return (
    <ActionForm action={action} pending={pending} className="space-y-4">
      <fieldset>
        <legend className="label">How checkout prices US dollars</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["live", "fixed"] as const).map((v) => (
            <label key={v} className="cursor-pointer rounded-2xl border border-slate-200 p-3 text-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 dark:border-white/10 dark:has-[:checked]:border-lime-400 dark:has-[:checked]:bg-lime-400/10">
              <input type="radio" name="rate_mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="sr-only" />
              <strong className="block">{v === "live" ? "Live rate" : "Fixed rate"}</strong>
              <span className="text-xs text-slate-500">{v === "live" ? "Market rate + your markup, updated every 15 min" : "A rate you set, until you change it"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={mode === "live" ? "" : "hidden"}>
        <label htmlFor="rate_markup" className="label">Markup on the market rate</label>
        <div className="flex gap-2">
          <input id="rate_markup" name="rate_markup" className="input" inputMode="decimal" value={markup} onChange={(e) => setMarkup(e.target.value)} />
          <span className="grid place-items-center rounded-2xl border border-slate-200 px-3 text-sm font-semibold dark:border-white/10">%</span>
        </div>
        <p className="hint">
          {info.market
            ? <>Market now: {fmtN(info.market)}. With {Number.isFinite(m) ? m : "?"}% markup, checkout charges <strong>{preview ? fmtN(preview) : "?"}</strong> per US$1.</>
            : "The market rate can't be reached right now; the fixed rate below is used until it can."}
        </p>
      </div>

      <div>
        <label htmlFor="usd_rate" className="label">{mode === "live" ? "Backup fixed rate" : "Fixed rate"} (Naira per US$1)</label>
        <div className="flex gap-2">
          <span className="grid place-items-center rounded-2xl border border-slate-200 px-3 text-sm font-semibold dark:border-white/10">₦</span>
          <input id="usd_rate" name="usd_rate" className="input" inputMode="decimal" defaultValue={info.fixed} required />
        </div>
        {mode === "live" && <p className="hint">Used only if the live rate service is down.</p>}
      </div>

      <FormMessage state={state} />
      <SubmitButton className="btn btn-dark" pendingText="Saving…">Save rate settings</SubmitButton>
    </ActionForm>
  );
}

export function RefreshRateButton() {
  const [state, action, pending] = useActionState(refreshRateAction, null);
  return (
    <ActionForm action={() => action()} pending={pending} className="space-y-2">
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Refreshing…"><RefreshCw className="h-4 w-4" /> Refresh market rate now</SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function TestEmailButton() {
  const [state, action, pending] = useActionState(testEmailAction, null);
  return (
    <ActionForm action={() => action()} pending={pending} className="space-y-2">
      <SubmitButton className="btn btn-outline btn-sm" pendingText="Sending…">Send me a test email</SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}
