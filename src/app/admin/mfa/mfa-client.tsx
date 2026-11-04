"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui";

function CodeForm({ onSubmit, busy, label }: { onSubmit: (code: string) => void; busy: boolean; label: string }) {
  const [code, setCode] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(code); }} className="space-y-3">
      <label htmlFor="code" className="label">{label}</label>
      <input id="code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
        className="input text-center text-2xl tracking-[0.5em]" autoFocus required minLength={6} />
      <button className="btn btn-dark w-full" disabled={busy || code.length !== 6}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify
      </button>
    </form>
  );
}

export function MfaChallenge() {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(code: string) {
    setBusy(true); setError(null);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (!factor) { router.push("/admin/mfa/enroll"); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) { setError("Invalid code. Try again."); return; }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <CodeForm onSubmit={verify} busy={busy} label="Enter the 6-digit code from your authenticator app" />
    </div>
  );
}

export function MfaEnroll() {
  const supabase = createClient();
  const router = useRouter();
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Clean up abandoned (unverified) enrolments first.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (existing?.totp.some((f) => f.status === "verified")) { router.replace("/admin/mfa"); return; }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Web Purchase admin ${Date.now()}` });
      if (error || !data) { setError(error?.message ?? "Could not start enrolment."); return; }
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(code: string) {
    if (!factor) return;
    setBusy(true); setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) { setError("That code didn't match. Check your device time and try again."); return; }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {!factor ? (
        <p className="muted flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</p>
      ) : (
        <>
          <ol className="muted list-decimal space-y-1 pl-5 text-sm">
            <li>Install Google Authenticator, 1Password, Authy or similar.</li>
            <li>Scan this QR code (or enter the key manually).</li>
            <li>Enter the 6-digit code to finish.</li>
          </ol>
          <div className="flex justify-center rounded-2xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={factor.qr} alt="Authenticator QR code" className="h-48 w-48" />
          </div>
          <p className="break-all rounded-xl bg-slate-100 p-3 text-center font-mono text-xs dark:bg-white/10">{factor.secret}</p>
          <CodeForm onSubmit={verify} busy={busy} label="6-digit code" />
        </>
      )}
    </div>
  );
}
