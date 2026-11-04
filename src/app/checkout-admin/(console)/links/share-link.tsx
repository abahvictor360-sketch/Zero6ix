"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";

/** The customer's payment link with copy / open / WhatsApp share. */
export function ShareLink({ url, text, compact = false }: { url: string; text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.getElementById("pay-link") as HTMLInputElement | null;
      el?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input id="pay-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="input !py-2 font-mono text-xs" aria-label="Payment link" />
        <button type="button" onClick={copy} className="btn btn-dark btn-sm shrink-0" aria-live="polite">
          {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
        </button>
      </div>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "pt-1"}`}>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" /> Share on WhatsApp</a>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><ExternalLink className="h-4 w-4" /> Open link</a>
      </div>
    </div>
  );
}
