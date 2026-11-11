"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileSearch, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { CurrencyCode, PayfxItem } from "@/lib/payfx/catalog";
import type { TransferView } from "@/lib/payfx/transfer-view";
import { TransferModal } from "@/components/payfx/transfer-modal";

type Item = PayfxItem & { logoSvg: string; logoTitle: string };
type Currencies = Record<CurrencyCode, { code: CurrencyCode; symbol: string; perNgn: number }>;
type GatewayKey = "paystack" | "flutterwave" | "transfer";
type Gateways = Record<GatewayKey, { on: boolean; currencies: string[] }>;

const round2 = (n: number) => Math.round(n * 100) / 100;

const GATEWAY_INFO = {
  paystack: { name: "Paystack", sub: "Card, bank, transfer, USSD", mark: "P", cls: "bg-white ring-1 ring-slate-200", logo: "/logos/paystack.svg" },
  flutterwave: { name: "Flutterwave", sub: "Card, bank transfer, USSD", mark: "F", cls: "bg-[#F5A623] text-white", logo: undefined as string | undefined },
  transfer: { name: "Direct bank transfer", sub: "Pay into our Fidelity Bank account, then upload your receipt", mark: "₦", cls: "bg-brand-900 text-lime-400", logo: undefined as string | undefined },
} as const;

export function PayfxCheckout({
  items, single, rate, currencies, gateways, ready, liveRate = null,
}: { items: Item[]; single: boolean; rate: number; currencies: Currencies; gateways: Gateways; ready: boolean; liveRate?: { refreshSeconds: number } | null }) {
  const router = useRouter();
  // Live rate: re-render from the server every few minutes so prices follow the market.
  useEffect(() => {
    if (!liveRate) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, Math.max(60, Math.min(liveRate.refreshSeconds, 300)) * 1000);
    return () => clearInterval(t);
  }, [liveRate, router]);
  const [selected, setSelected] = useState<string[]>(() => items.filter((i) => single || !i.test).map((i) => i.id));
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [gateway, setGateway] = useState<GatewayKey>("paystack");
  const [transfer, setTransfer] = useState<{ view: TransferView; link: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorLink, setErrorLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const findRef = useRef<HTMLDialogElement>(null);
  const [findError, setFindError] = useState<string | null>(null);

  useEffect(() => {
    try { const c = localStorage.getItem("payfx-currency"); if (c === "USD" || c === "NGN") setCurrency(c); } catch {}
  }, []);

  const convert = (ngn: number, cur: CurrencyCode = currency) => round2(ngn * currencies[cur].perNgn);
  const money = (n: number, cur: CurrencyCode = currency) =>
    `${currencies[cur].symbol}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const gatewayOk = (g: keyof Gateways) => gateways[g].on && gateways[g].currencies.includes(currency);
  // Keep a usable gateway selected when the currency changes.
  useEffect(() => {
    if (!gatewayOk(gateway)) {
      const other = (["paystack", "flutterwave", "transfer"] as GatewayKey[]).find((g) => gatewayOk(g));
      if (other) setGateway(other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const services = items.filter((i) => !i.test);
  const chosen = items.filter((i) => selected.includes(i.id));
  const total = useMemo(() => round2(chosen.reduce((s, i) => s + convert(i.amount), 0)), [chosen, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const ngnTotal = chosen.reduce((s, i) => s + i.amount, 0);
  const pickedServices = services.filter((i) => selected.includes(i.id)).length;
  const allChecked = pickedServices === services.length && services.length > 0;

  function toggleAll(on: boolean) {
    const tests = selected.filter((id) => items.find((i) => i.id === id)?.test);
    setSelected(on ? [...services.map((i) => i.id), ...tests] : tests);
  }

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setErrorLink(null);
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get("name") ?? ""), email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? ""), company: String(f.get("company") ?? ""),
      gateway, currency, items: selected,
    };
    if (!body.name.trim() || !/^\S+@\S+\.\S+$/.test(body.email)) { setError("Enter your name and a valid email."); return; }
    if (!gatewayOk(gateway)) { setError("No payment method is available for this currency right now."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/payfx/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data.transfer) { setTransfer({ view: data.transfer, link: data.linkUrl }); setTransferOpen(true); setBusy(false); return; }
      setError(data.error || "Something went wrong."); setErrorLink(data.invoiceUrl ?? null);
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  async function find(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFindError(null);
    const res = await fetch("/api/payfx/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
    const data = await res.json().catch(() => ({}));
    if (data.invoiceUrl) window.location.href = data.invoiceUrl; else setFindError(data.error ?? "Not found.");
  }

  const heading = single ? `Pay for ${items[0].name}${items[0].subtitle ? ` (${items[0].subtitle})` : ""}` : "Items and funding required";

  return (
    <>
      <section className="bg-brand-900 py-10 text-white dark:bg-[#06140f] sm:py-14">
        <div className="container">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {single ? (
              <Link href="/checkout" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"><ArrowLeft className="h-4 w-4" /> All services</Link>
            ) : <span className="eyebrow !text-lime-300">Checkout</span>}
            <button type="button" onClick={() => findRef.current?.showModal()} className="btn btn-ghost-light btn-sm"><FileSearch className="h-4 w-4" /> Find my invoice</button>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            {!single && <span className="mr-3 text-lime-400">07</span>}{heading}
          </h1>
          <p className="mt-3 max-w-2xl text-white/75">
            {liveRate
              ? <span className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-2 py-0.5 text-xs font-semibold text-lime-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" aria-hidden /> Live rate</span>
              : null}
            Exchange rate: US$1 = ₦{rate.toLocaleString("en-US")}.{" "}
            {single ? "Enter your details, then choose how to pay." : "Select the services you are paying for, or open one to pay for it alone."}
          </p>
        </div>
      </section>

      <section className="container grid gap-8 py-10 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <div>
          {!single && (
            <div className="mb-3 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 rounded text-brand-700" checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = pickedServices > 0 && !allChecked; }}
                  onChange={(e) => toggleAll(e.target.checked)} />
                Select all
              </label>
              <span className="text-sm text-slate-500">{selected.length} of {items.length} selected</span>
            </div>
          )}
          <ul className="space-y-3">
            {items.map((i) => {
              const on = selected.includes(i.id);
              return (
                <li key={i.id} className={`card p-0 transition ${on ? "ring-2 ring-brand-600 dark:ring-lime-400" : ""}`}>
                  <label className="flex cursor-pointer gap-3 p-4 sm:gap-4 sm:p-5">
                    <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded text-brand-700" checked={on} disabled={single}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-900 ring-1 ring-slate-200 dark:bg-white dark:ring-0"
                      title={i.logoTitle} dangerouslySetInnerHTML={{ __html: i.logoSvg }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <strong className="font-semibold">{i.name}</strong>
                        {i.subtitle && <span className="text-sm text-slate-500">{i.subtitle}</span>}
                      </span>
                      <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{i.period}</span>
                      <span className="mt-1.5 block text-sm leading-6 text-slate-600 dark:text-slate-400">{i.purpose}</span>
                    </span>
                    <span className="shrink-0 text-right font-semibold tabular-nums">{money(convert(i.amount))}</span>
                  </label>
                  {!single && (
                    <div className="border-t border-slate-100 px-5 py-2 text-right dark:border-white/10">
                      <Link href={`/checkout?item=${encodeURIComponent(i.id)}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-lime-400">
                        Pay for this only <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={pay} className="card space-y-5 p-5 sm:p-6" noValidate>
            <div className="space-y-3">
              <h2 className="font-semibold">Your details</h2>
              <input name="name" className="input" placeholder="Full name" autoComplete="name" required aria-label="Full name" />
              <input name="email" type="email" className="input" placeholder="Email" autoComplete="email" required aria-label="Email" />
              <input name="phone" type="tel" className="input" placeholder="Phone (optional)" autoComplete="tel" aria-label="Phone" />
              <input name="company" className="input" placeholder="Company (optional)" autoComplete="organization" aria-label="Company" />
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 font-semibold">Payment method</legend>
              {(Object.keys(GATEWAY_INFO) as (keyof typeof GATEWAY_INFO)[]).map((g) => {
                const info = GATEWAY_INFO[g];
                const ok = gatewayOk(g);
                const note = !gateways[g].on ? "Not available yet" : !ok ? `Not available for ${currency} payments` : info.sub;
                return (
                  <label key={g} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${!ok ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${gateway === g && ok ? "border-brand-700 bg-brand-50 dark:border-lime-400 dark:bg-lime-400/10" : "border-slate-200 dark:border-white/10"}`}>
                    <input type="radio" name="gateway" value={g} checked={gateway === g} disabled={!ok} onChange={() => setGateway(g)} className="sr-only" />
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${info.cls}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {info.logo ? <img src={info.logo} alt="" width={20} height={20} className="h-5 w-5" /> : info.mark}
                    </span>
                    <span><strong className="block text-sm">{info.name}</strong><span className="text-xs text-slate-500">{note}</span></span>
                  </label>
                );
              })}
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-semibold">Currency</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.values(currencies)).map((c) => (
                  <label key={c.code} className={`cursor-pointer rounded-full border px-3 py-2 text-center text-sm font-semibold ${currency === c.code ? "border-brand-700 bg-brand-900 text-white dark:border-lime-400 dark:bg-lime-400 dark:text-brand-950" : "border-slate-200 dark:border-white/10"}`}>
                    <input type="radio" name="currency" value={c.code} checked={currency === c.code} className="sr-only"
                      onChange={() => { setCurrency(c.code); try { localStorage.setItem("payfx-currency", c.code); } catch {} }} />
                    {c.symbol} {c.code}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="rounded-2xl bg-brand-900 p-4 text-white dark:bg-brand-950 dark:ring-1 dark:ring-white/10">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-white/70">Total</span>
                <strong className="text-2xl tabular-nums text-lime-400">{money(total)}</strong>
              </div>
              {total > 0 && (
                <p className="mt-1 text-right text-xs text-white/60">
                  ≈ {currency === "NGN" ? money(convert(ngnTotal, "USD"), "USD") : money(ngnTotal, "NGN")}
                </p>
              )}
            </div>

            {!ready && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Online payment for this page is being set up. Please contact us to pay.</p>}
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                {error} {errorLink && <Link href={errorLink} className="font-semibold underline">View invoice</Link>}
              </p>
            )}
            <button type="submit" className="btn btn-dark btn-lg w-full" disabled={busy || !selected.length || !ready}>
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {gateway === "transfer" ? "Preparing your invoice…" : "Redirecting to payment…"}</>
                : <><Lock className="h-4 w-4" /> {gateway === "transfer" ? `Pay ${total > 0 ? money(total) : ""} by bank transfer` : `Pay ${total > 0 ? money(total) : "now"}`}</>}
            </button>
            {transfer && !transferOpen && (
              <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:bg-lime-400/10 dark:text-lime-200">
                Invoice {transfer.view.invoiceNumber} is saved.{" "}
                <button type="button" onClick={() => setTransferOpen(true)} className="font-semibold underline">Show bank details</button>{" "}
                or <a href={transfer.link} className="font-semibold underline">open it later</a>.
              </p>
            )}
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              You get an invoice listing every item. It is marked paid once the payment is confirmed. Card details are handled by Paystack or Flutterwave, never by us.
            </p>
          </form>
          {transfer && <TransferModal view={transfer.view} open={transferOpen} onClose={() => setTransferOpen(false)} />}
        </aside>
      </section>

      <dialog ref={findRef} className="w-[min(92vw,420px)] rounded-3xl p-0 backdrop:bg-black/50 dark:bg-[#0b1f17] dark:text-white">
        <form onSubmit={find} className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">Find my invoice</h2>
          <input name="invoiceNumber" className="input" placeholder="Invoice number, e.g. INV-2026-0001" required aria-label="Invoice number" />
          <input name="email" type="email" className="input" placeholder="Email used at checkout" required aria-label="Email" />
          {findError && <p className="text-sm text-red-600">{findError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => findRef.current?.close()}>Cancel</button>
            <button type="submit" className="btn btn-dark btn-sm">Open invoice</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
