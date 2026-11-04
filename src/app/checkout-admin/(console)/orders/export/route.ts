import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/payfx/admin-auth";
import { listOrders, logAdmin } from "@/lib/payfx/admin-store";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Quote, and stop spreadsheet formula injection.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** CSV of orders for Excel / Google Sheets. */
export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const s = new URL(request.url).searchParams.get("status");
  const status = s === "paid" || s === "pending" ? s : undefined;
  const orders = await listOrders({ status, limit: 5000 });
  const head = ["Invoice", "Status", "Created", "Paid at", "Customer", "Email", "Phone", "Company", "Items", "Currency", "Total", "Total NGN", "USD rate", "Gateway", "Paid with", "Transaction ID", "Order ref"];
  const rows = orders.map((o) => [
    o.invoiceNumber, o.status, o.createdAt, o.paidAt ?? "", o.customer?.name, o.email, o.customer?.phone, o.customer?.company,
    (o.items ?? []).map((i) => (i.subtitle ? `${i.name} (${i.subtitle})` : i.name)).join("; "),
    o.currency, o.total, o.ngnTotal, o.rate, o.gateway, o.channel ?? "", o.transactionId ?? "", o.ref,
  ]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  await logAdmin(admin, "orders_exported", null, { count: orders.length, status: status ?? "all" });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="checkout-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
