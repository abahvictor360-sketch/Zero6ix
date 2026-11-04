import { NextResponse } from "next/server";
import { getOrder } from "@/lib/payfx/store";
import { renderPayfxInvoice } from "@/lib/payfx/pdf";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const order = await getOrder(ref).catch(() => null);
  if (!order) return new NextResponse("Invoice not found", { status: 404 });
  const pdf = await renderPayfxInvoice(order);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
