"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Building2, Check, CheckCircle2, Clock, Copy, FileUp, Loader2, X } from "lucide-react";
import type { TransferView } from "@/lib/payfx/transfer-view";

const ngn = (n: number) => `₦${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MAX_MB = 5;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); } catch { /* clipboard blocked: user can still select the text */ }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/5"
      aria-label={`Copy ${label}`}
    >
      {done ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
    </button>
  );
}

/** Milliseconds left, or null before the first tick in the browser (keeps server and client HTML identical). */
function useCountdown(dueAt: string) {
  const end = new Date(dueAt).getTime();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [end]);
  return left;
}

/**
 * Bank transfer popup: what they're paying for, the account details, a
 * countdown, and a form to upload the bank receipt for the admin to confirm.
 */
export function TransferModal({ view, open, onClose }: { view: TransferView; open: boolean; onClose: () => void }) {
  const [state, setState] = useState<"form" | "sending" | "done">(view.status === "submitted" ? "done" : "form");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const total = Math.max(1, view.windowMinutes * 60_000);
  const left = useCountdown(view.dueAt) ?? total;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const expired = left <= 0;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!open) return null;

  function pick(f: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!f) { setFile(null); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`That file is too large. The limit is ${MAX_MB}MB.`); setFile(null); return; }
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Attach your transfer receipt (a screenshot, photo or PDF)."); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("receipt", file);
    setState("sending");
    try {
      const res = await fetch(`/api/payfx/transfer/${encodeURIComponent(view.ref)}`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Upload failed. Please try again."); setState("form"); return; }
      setState("done");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("form");
    }
  }

  const pct = Math.min(100, (left / total) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white text-slate-900 shadow-2xl outline-none dark:bg-brand-950 dark:text-slate-100 sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-brand-950/95">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-900 text-lime-400"><Building2 className="h-5 w-5" /></span>
            <div>
              <h2 id="transfer-title" className="font-semibold leading-tight">Pay by bank transfer</h2>
              <p className="text-xs text-slate-500">Invoice {view.invoiceNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {state === "done" ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold">Receipt received</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-300">
                Thank you, {view.customerName.split(" ")[0]}. We&apos;ll check our account and confirm your payment of <strong>{ngn(view.total)}</strong> shortly.
                You&apos;ll get an email with your receipt once it&apos;s confirmed.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a href={`/checkout/link/${view.ref}`} className="btn btn-dark">View invoice status</a>
              <button type="button" onClick={() => setState("form")} className="btn btn-outline">Upload another receipt</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 px-5 py-5">
            {view.status === "rejected" && (
              <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>We couldn&apos;t confirm your last receipt{view.rejectedReason ? `: ${view.rejectedReason}` : "."} Please upload a clearer receipt or contact us.</p>
              </div>
            )}

            {/* Amount + what it's for */}
            <div className="rounded-2xl bg-brand-900 p-4 text-white">
              <p className="text-xs text-white/70">Transfer exactly</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-2xl font-bold tabular-nums">{ngn(view.total)}</p>
                <span className="[&_button]:border-white/30 [&_button]:text-white [&_button:hover]:bg-white/10"><CopyButton value={view.total.toFixed(2)} label="amount" /></span>
              </div>
              <ul className="mt-3 space-y-1 border-t border-white/15 pt-3 text-sm">
                {view.items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-3"><span className="min-w-0 text-white/85">{i.name}</span><span className="shrink-0 tabular-nums">{ngn(i.amount)}</span></li>
                ))}
              </ul>
            </div>

            {/* Countdown */}
            <div className={`rounded-2xl border p-3 ${expired ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "border-slate-200 dark:border-white/10"}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium"><Clock className="h-4 w-4" /> {expired ? "Time's up" : "Complete your transfer within"}</span>
                <span className="font-mono text-lg font-bold tabular-nums" aria-live="off">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className={`h-full rounded-full transition-[width] duration-1000 ${expired ? "bg-amber-500" : "bg-lime-500"}`} style={{ width: `${pct}%` }} />
              </div>
              {expired && <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">If you&apos;ve already transferred, upload your receipt below. If not, you can still pay the same amount to the account below.</p>}
            </div>

            {/* Account details */}
            <div>
              <p className="mb-2 text-sm font-semibold">1. Transfer to this account</p>
              <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><dt className="text-xs text-slate-500">Bank</dt><dd className="font-semibold">{view.bank.bank}</dd></div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><dt className="text-xs text-slate-500">Account number</dt><dd className="font-mono text-xl font-bold tracking-wider">{view.bank.accountNumber}</dd></div>
                  <CopyButton value={view.bank.accountNumber} label="account number" />
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><dt className="text-xs text-slate-500">Account name</dt><dd className="font-semibold">{view.bank.accountName}</dd></div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><dt className="text-xs text-slate-500">Narration / description</dt><dd className="font-mono font-semibold">{view.invoiceNumber}</dd></div>
                  <CopyButton value={view.invoiceNumber} label="narration" />
                </div>
              </dl>
              <p className="mt-2 text-xs text-slate-500">Put <strong>{view.invoiceNumber}</strong> in the transfer description so we can match your payment quickly. Only pay into this account.</p>
            </div>

            {/* Receipt upload */}
            <div>
              <p className="mb-2 text-sm font-semibold">2. Upload your transfer receipt</p>
              <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center text-sm transition ${file ? "border-brand-700 bg-brand-50 dark:border-lime-400 dark:bg-lime-400/10" : "border-slate-300 hover:border-brand-700 dark:border-white/20"}`}>
                <input type="file" name="receipt_picker" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                {preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={preview} alt="Receipt preview" className="max-h-40 rounded-lg object-contain" />
                  : <FileUp className="h-7 w-7 text-slate-400" />}
                <span className="font-medium">{file ? file.name : "Tap to choose a screenshot, photo or PDF"}</span>
                <span className="text-xs text-slate-500">{file ? `${(file.size / 1024 / 1024).toFixed(2)}MB · tap to change` : `JPG, PNG, WEBP or PDF, up to ${MAX_MB}MB`}</span>
              </label>
              <div className="mt-3 grid gap-2">
                <input name="sender_name" className="input" placeholder="Name on the account you paid from (optional)" maxLength={120} autoComplete="name" />
                <input name="note" className="input" placeholder="Note for us (optional)" maxLength={500} />
              </div>
            </div>

            {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

            <button type="submit" disabled={state === "sending"} className="btn btn-primary btn-lg w-full">
              {state === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : "I've sent the money, submit receipt"}
            </button>
            <p className="text-center text-xs text-slate-500">We confirm transfers within a few hours on business days and email your receipt. Questions? Contact us before paying.</p>
          </form>
        )}
      </div>
    </div>
  );
}

/** A "Pay by bank transfer" button that opens the popup (used on invoice and payment-link pages). */
export function TransferButton({ view, autoOpen = false, className = "btn btn-outline btn-lg w-full", label = "Pay by bank transfer" }: { view: TransferView; autoOpen?: boolean; className?: string; label?: string }) {
  const [open, setOpen] = useState(autoOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}><Building2 className="h-4 w-4" /> {label}</button>
      <TransferModal view={view} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
