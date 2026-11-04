import Link from "next/link";
import { AlertTriangle, Banknote, Clock, CreditCard, Inbox } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, StatusBadge, Pill } from "@/components/ui";
import { RevenueChart, StatusChart } from "@/components/admin/charts";
import { formatMoney, timeAgo } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";
import type { RequestRow, RequestStatus } from "@/lib/types";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireStaff();
  const db = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [statusRows, payments, recent, newToday, flagged, pendingKyc] = await Promise.all([
    db.from("requests").select("status"),
    db.from("payments").select("amount_paid_ngn, paid_at").eq("status", "success").gte("paid_at", since30),
    db.from("requests").select("*").order("created_at", { ascending: false }).limit(8),
    db.from("requests").select("id", { count: "exact", head: true }).gte("created_at", today),
    db.from("requests").select("id", { count: "exact", head: true }).eq("flagged", true).in("status", ["submitted", "under_review", "draft"]),
    db.from("kyc_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const byStatus = new Map<RequestStatus, number>();
  for (const r of statusRows.data ?? []) byStatus.set(r.status as RequestStatus, (byStatus.get(r.status as RequestStatus) ?? 0) + 1);
  const statusData = (Object.keys(STATUS_LABELS) as RequestStatus[]).filter((s) => byStatus.get(s)).map((s) => ({ status: STATUS_LABELS[s], count: byStatus.get(s)! }));

  const days: { day: string; revenue: number }[] = [];
  const index = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    index.set(key, days.length);
    days.push({ day: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), revenue: 0 });
  }
  let monthRevenue = 0;
  for (const p of payments.data ?? []) {
    const k = p.paid_at?.slice(0, 10);
    if (k && index.has(k)) days[index.get(k)!].revenue += Number(p.amount_paid_ngn ?? 0);
    if (p.paid_at && p.paid_at >= monthStart) monthRevenue += Number(p.amount_paid_ngn ?? 0);
  }

  const pendingReview = (byStatus.get("submitted") ?? 0) + (byStatus.get("draft") ?? 0);
  const pendingPayment = byStatus.get("quote_sent") ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Today at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="New today" value={newToday.count ?? 0} icon={<Inbox className="h-5 w-5" />} />
        <StatCard label="Awaiting review" value={pendingReview} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Pending payment" value={pendingPayment} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Revenue this month" value={formatMoney(monthRevenue)} icon={<Banknote className="h-5 w-5" />} hint="Gross amount collected" />
        <StatCard label="Flagged / KYC pending" value={`${flagged.count ?? 0} / ${pendingKyc.count ?? 0}`} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card">
          <h2 className="mb-4 font-semibold">Revenue, last 30 days</h2>
          <RevenueChart data={days} />
        </section>
        <section className="card">
          <h2 className="mb-4 font-semibold">Orders by status</h2>
          {statusData.length ? <StatusChart data={statusData} /> : <p className="muted text-sm">No orders yet.</p>}
        </section>
      </div>
      <section className="card p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold">Latest requests</h2>
          <Link href="/admin/requests" className="text-sm font-medium text-brand-700 dark:text-lime-400">View all</Link>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {((recent.data ?? []) as RequestRow[]).map((r) => (
            <li key={r.id}>
              <Link href={`/admin/requests/${r.id}`} className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title} {r.flagged && <Pill tone="red">Flagged</Pill>}</p>
                  <p className="text-xs text-slate-500">{r.reference} · {r.source} · {timeAgo(r.created_at)}</p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
