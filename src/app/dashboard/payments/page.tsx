import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import type { Payment } from "@/lib/types";

export const metadata = { title: "Payments" };

const TONE = { success: "green", pending: "amber", failed: "red", refunded: "blue", abandoned: "slate" } as const;

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*, requests(reference, title)")
    .order("created_at", { ascending: false })
    .limit(200);
  const payments = (data ?? []) as (Payment & { requests: { reference: string; title: string } | null })[];
  const total = payments.filter((p) => p.status === "success").reduce((s, p) => s + Number(p.amount_paid_ngn ?? 0), 0);

  return (
    <>
      <PageHeader title="Payment history" description={`Total paid: ${formatMoney(total)}`} />
      {payments.length === 0 ? (
        <EmptyState title="No payments yet" description="Invoices and receipts will appear here after you pay a quote." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Date</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Documents</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{formatDate(p.paid_at ?? p.created_at)}</td>
                  <td>
                    <Link href={`/dashboard/requests/${p.request_id}`} className="font-semibold text-brand-700 hover:underline dark:text-lime-400">{p.requests?.reference}</Link>
                    <p className="max-w-[220px] truncate text-xs text-slate-500">{p.requests?.title}</p>
                  </td>
                  <td className="whitespace-nowrap font-medium">{formatMoney(p.amount_paid_ngn ?? p.amount_ngn)}</td>
                  <td className="capitalize">{p.provider}{p.channel ? ` · ${p.channel.replace(/_/g, " ")}` : ""}</td>
                  <td><Pill tone={TONE[p.status]}>{p.status}</Pill></td>
                  <td className="whitespace-nowrap">
                    {p.status === "success" ? (
                      <div className="flex gap-2">
                        <a href={`/api/invoices/${p.id}?kind=invoice`} className="btn btn-outline btn-sm"><Download className="h-3.5 w-3.5" /> Invoice</a>
                        <a href={`/api/invoices/${p.id}?kind=receipt`} className="btn btn-outline btn-sm"><Download className="h-3.5 w-3.5" /> Receipt</a>
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
