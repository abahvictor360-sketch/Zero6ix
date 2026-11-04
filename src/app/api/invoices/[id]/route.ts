import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoiceData } from "@/lib/payments/service";
import { renderInvoicePdf } from "@/lib/pdf";

/** Download an invoice or receipt PDF. Access is checked through RLS on `payments`. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind") === "receipt" ? "receipt" : "invoice";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data: payment } = await supabase.from("payments").select("id").eq("id", id).maybeSingle();
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await buildInvoiceData(id, kind);
  if (!data) return NextResponse.json({ error: "Document available after successful payment" }, { status: 404 });
  const pdf = await renderInvoicePdf(data);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
