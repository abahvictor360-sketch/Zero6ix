import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, CreditCard, Package, PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { formatMoney, timeAgo } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/status";
import type { RequestRow } from "@/lib/types";

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("requests").select("*").order("created_at", { ascending: false }).limit(50);
  const requests = (data ?? []) as RequestRow[];
  const open = requests.filter((r) => OPEN_STATUSES.includes(r.status)).length;
  const awaiting = requests.filter((r) => r.status === "quote_sent");
  const done = requests.filter((r) => ["completed", "delivered"].includes(r.status)).length;
  const { data: paid } = await supabase.from("payments").select("amount_paid_ngn").eq("status", "success");
  const spent = (paid ?? []).reduce((s, p) => s + Number(p.amount_paid_ngn ?? 0), 0);
  const firstName = user.profile.full_name?.split(" ")[0] || "there";
  const needsPhone = process.env.REQUIRE_PHONE_VERIFICATION !== "false" && !user.profile.phone_verified;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hi {firstName} 👋</h1>
          <p className="muted text-sm">What would you like us to pay for today?</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/requests/new?type=service" className="btn btn-dark"><PlusCircle className="h-4 w-4" /> Request a payment</Link>
          <Link href="/dashboard/requests/new?type=item" className="btn btn-outline"><Package className="h-4 w-4" /> Buy an item</Link>
        </div>
      </div>

      {sp.password === "updated" && <Alert tone="success">Your password has been updated.</Alert>}
      {needsPhone && (
        <Alert tone="warning">
          <strong>Verify your phone number</strong> to start submitting requests. <Link href="/dashboard/verify" className="font-semibold underline">Verify now</Link>
        </Alert>
      )}
      {awaiting.length > 0 && (
        <Alert tone="info">
          You have {awaiting.length} quote{awaiting.length > 1 ? "s" : ""} waiting for payment. Quotes expire after 24 hours.{" "}
          <Link href={`/dashboard/requests/${awaiting[0].id}`} className="font-semibold underline">View quote</Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open requests" value={open} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Awaiting payment" value={awaiting.length} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Completed" value={done} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Total paid" value={formatMoney(spent)} />
      </div>

      <section className="card p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold">Recent requests</h2>
          <Link href="/dashboard/requests" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-lime-400">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {requests.length ? (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {requests.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/requests/${r.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.reference} · {r.type === "item" ? "Item" : "Service"} · {timeAgo(r.created_at)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6"><EmptyState title="No requests yet" description="Submit your first request and we'll send you a Naira quote." action={<Link href="/dashboard/requests/new" className="btn btn-dark btn-sm">New request</Link>} /></div>
        )}
      </section>
    </div>
  );
}
