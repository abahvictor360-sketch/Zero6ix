"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import type { ExchangeRate } from "@/lib/types";
import { formatDate } from "@/lib/format";

/** Live exchange-rate widget with a quick converter. Polls /api/rates every 2 minutes. */
export function RateWidget({ initial }: { initial: ExchangeRate[] }) {
  const [rates, setRates] = useState(initial);
  const [currency, setCurrency] = useState(initial[0]?.currency ?? "USD");
  const [amount, setAmount] = useState("100");
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/rates", { cache: "no-store" });
      if (res.ok) setRates((await res.json()).rates);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = setInterval(refresh, 120_000);
    return () => clearInterval(t);
  }, []);

  const rate = rates.find((r) => r.currency === currency);
  const converted = useMemo(() => (rate ? Number(amount || 0) * rate.sell_rate : 0), [amount, rate]);
  const updated = rates.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), "");
  const indicative = rates.some((r) => r.source === "fallback");

  return (
    <div className="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl ring-1 ring-black/5 dark:bg-[#0b1f17] dark:text-white dark:ring-white/10">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {indicative ? (
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          ) : (
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
          )}
          {indicative ? "Indicative rates" : "Live rates"}
        </p>
        <button onClick={refresh} className="-my-2 inline-flex min-h-[32px] items-center gap-1 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Refresh rates">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> {updated && !indicative ? `Updated ${formatDate(updated, true)}` : "Refresh"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
        <label className="text-xs text-slate-500" htmlFor="rw-amount">You pay vendor</label>
        <div className="mt-1 flex items-center gap-2">
          <input id="rw-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-full min-w-0 border-0 bg-transparent p-0 text-2xl font-bold focus:ring-0" />
          <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="rounded-full border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold dark:border-white/10 dark:bg-white/10">
            {rates.map((r) => <option key={r.currency} value={r.currency}>{r.currency}</option>)}
          </select>
        </div>
      </div>
      <div className="my-2 flex justify-center text-slate-400"><ArrowRightLeft className="h-4 w-4 rotate-90" /></div>
      <div className="rounded-2xl bg-brand-900 p-3 text-white">
        <p className="text-xs text-white/60">You pay us (before fees)</p>
        <p className="mt-1 text-2xl font-bold">₦{converted.toLocaleString("en-NG", { maximumFractionDigits: 2 })}</p>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {rates.slice(0, 6).map((r) => (
          <li key={r.currency} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-white/10">
            <span className="font-medium">{r.currency}</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300">₦{r.sell_rate.toLocaleString("en-NG")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
