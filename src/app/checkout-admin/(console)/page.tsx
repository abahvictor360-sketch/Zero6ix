import Link from "next/link";
import { CheckCircle2, Circle, Clock, Mail, Package, Wallet } from "lucide-react";
import { adminStoreConfigured, countNewMessages, getSettings, listOrders, listProducts, StoreError } from "@/lib/payfx/admin-store";
import { money } from "@/lib/payfx/catalog";
import { gatewayStatus } from "@/lib/payfx/gateways";
import { envValue } from "@/lib/env";
import { Alert, PageHeader, StatCard } from "@/components/ui";
import { OrdersTable } from "./orders/orders-table";

export const metadata = { title: "Overview" };

const DAY = 86_400_000;
const lagosDay = (d: Date) => new Date(d.getTime() + 3_600_000).toISOString().slice(0, 10); // WAT = UTC+1

export default async function AdminOverview() {
  let error = "";
  const [orders, products, newMessages, tablesReady] = await Promise.all([
    listOrders({ limit: 2000 }).catch((e) => { error = e instanceof StoreError ? e.message : "Could not load orders."; return []; }),
    listProducts().catch(() => null),
    countNewMessages(),
    getSettings().then(() => true).catch(() => false),
  ]);
  const paid = orders.filter((o) => o.status === "paid");
  const pending = orders.filter((o) => o.status === "pending");
  const sum = (list: typeof orders) => list.reduce((s, o) => s + Number(o.ngnTotal || 0), 0);
  const paidAt = (o: (typeof orders)[number]) => new Date(o.paidAt ?? o.createdAt);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = paid.filter((o) => paidAt(o) >= monthStart);

  // Daily paid totals for the last 30 days.
  const days = Array.from({ length: 30 }, (_, i) => lagosDay(new Date(now.getTime() - (29 - i) * DAY)));
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of paid) {
    const d = lagosDay(paidAt(o));
    if (byDay.has(d)) byDay.set(d, byDay.get(d)! + Number(o.ngnTotal || 0));
  }
  const series = days.map((d) => ({ d, v: byDay.get(d)! }));
  const max = Math.max(1, ...series.map((s) => s.v));
  const last30 = series.reduce((s, x) => s + x.v, 0);

  // Best-selling items (paid orders).
  const top = new Map<string, { name: string; count: number; ngn: number }>();
  for (const o of paid) for (const l of o.items ?? []) {
    const k = l.subtitle ? `${l.name} (${l.subtitle})` : l.name;
    const t = top.get(k) ?? { name: k, count: 0, ngn: 0 };
    t.count += 1; t.ngn += Number(l.ngnAmount || 0);
    top.set(k, t);
  }
  const topItems = [...top.values()].sort((a, b) => b.ngn - a.ngn).slice(0, 5);

  const gw = gatewayStatus();
  const setup = [
    { ok: adminStoreConfigured(), label: "Database key added in Vercel (PAYFX_SUPABASE_SERVICE_ROLE_KEY)" },
    { ok: tablesReady && products !== null, label: "Admin tables created (run supabase/leadloop/checkout_admin.sql)" },
    { ok: gw.paystack.on, label: "Paystack key added (PAYSTACK_SECRET_KEY)" },
    { ok: gw.flutterwave.on, label: "Flutterwave key added (optional)" },
    { ok: Boolean(envValue("RESEND_API_KEY")), label: "Email sending (Resend) connected" },
  ];
  const setupDone = setup.filter((s) => s.ok).length;

  return (
    <>
      <PageHeader title="Overview" description="Checkout payments at a glance." actions={<><Link href="/checkout-admin/items/new" className="btn btn-outline btn-sm">Add item</Link><Link href="/checkout-admin/links/new" className="btn btn-dark btn-sm">Create payment link</Link></>} />
      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      {setupDone < setup.length && (
        <section className="card mb-6">
          <h2 className="font-semibold">Finish setting up ({setupDone}/{setup.length})</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {setup.map((s) => (
              <li key={s.label} className="flex items-start gap-2">
                {s.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                <span className={s.ok ? "text-slate-500 line-through" : ""}>{s.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paid this month" value={money(sum(thisMonth))} hint={`${thisMonth.length} order${thisMonth.length === 1 ? "" : "s"} · All time ${money(sum(paid))}`} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Awaiting payment" value={pending.length} hint={pending.length ? `${money(sum(pending))} in unpaid invoices` : "No unpaid invoices"} icon={<Clock className="h-5 w-5" />} />
        <StatCard
          label="Items on checkout"
          value={products ? products.filter((p) => p.active).length : "–"}
          hint={products ? `${products.filter((p) => !p.active).length} hidden` : "Items table not set up yet"}
          icon={<Package className="h-5 w-5" />}
        />
        <Link href="/checkout-admin/messages" className="block">
          <StatCard label="New messages" value={newMessages} hint="From the contact form" icon={<Mail className="h-5 w-5" />} />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Payments, last 30 days</h2>
            <span className="text-sm font-semibold">{money(last30)}</span>
          </div>
          <div className="mt-4 flex h-40 items-end gap-[3px]" role="img" aria-label={`Paid per day over the last 30 days, total ${money(last30)}`}>
            {series.map((s) => (
              <div key={s.d} className="group relative flex h-full flex-1 items-end">
                <div className={`w-full rounded-t ${s.v ? "bg-brand-700 dark:bg-lime-400" : "bg-slate-100 dark:bg-white/10"}`} style={{ height: `${s.v ? Math.max(4, (s.v / max) * 100) : 2}%` }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                  {new Date(s.d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: {money(s.v)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>{new Date(days[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            <span>Today</span>
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold">Best-selling items</h2>
          {topItems.length ? (
            <ul className="mt-3 space-y-2.5 text-sm">
              {topItems.map((t) => (
                <li key={t.name} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{t.name} <span className="text-slate-500">×{t.count}</span></span>
                  <span className="shrink-0 font-semibold">{money(t.ngn)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted mt-3 text-sm">No paid orders yet.</p>}
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <Link href="/checkout-admin/orders" className="text-sm font-medium text-brand-700 hover:underline dark:text-lime-400">See all</Link>
      </div>
      <div className="mt-3"><OrdersTable orders={orders.slice(0, 8)} /></div>
    </>
  );
}
