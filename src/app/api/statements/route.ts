import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderStatementPdf } from "@/lib/pdf";

/** Monthly organisation statement (PDF). Membership is enforced by RLS. */
export async function GET(request: NextRequest) {
  const org = request.nextUrl.searchParams.get("org") ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(org) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: organisation } = await supabase.from("organisations").select("name, rc_number, address").eq("id", org).maybeSingle();
  if (!organisation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = new Date(`${month}-01T00:00:00+01:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const { data: payments } = await supabase
    .from("payments")
    .select("paid_at, reference, amount_paid_ngn, requests(reference, title)")
    .eq("organisation_id", org)
    .eq("status", "success")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString())
    .order("paid_at");

  const pdf = await renderStatementPdf({
    organisation,
    month,
    payments: (payments ?? []).map((p) => {
      const r = p.requests as unknown as { reference: string; title: string } | null;
      return { paid_at: p.paid_at!, reference: p.reference, request_reference: r?.reference ?? "", title: r?.title ?? "", amount: Number(p.amount_paid_ngn ?? 0) };
    }),
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="statement-${month}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
