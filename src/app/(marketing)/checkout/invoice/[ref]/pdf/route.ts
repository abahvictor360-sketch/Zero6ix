import { NextResponse, type NextRequest } from "next/server";
import { getOrder } from "@/lib/payfx/store";
import { renderPayfxDocument, type DocBrand, type DocKind } from "@/lib/payfx/pdf";

export const dynamic = "force-dynamic";

/**
 * /checkout/invoice/<ref>/pdf?doc=invoice|receipt&brand=webpurchase|item&item=<id>
 * Receipts are only issued once the payment has been confirmed.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const sp = request.nextUrl.searchParams;
  const kind: DocKind = sp.get("doc") === "receipt" ? "receipt" : "invoice";
  const brand: DocBrand = sp.get("brand") === "item" ? "item" : "webpurchase";
  const order = await getOrder(ref).catch(() => null);
  if (!order) return new NextResponse("Invoice not found", { status: 404 });
  if (kind === "receipt" && order.status !== "paid") return new NextResponse("A receipt is available once payment is confirmed.", { status: 409 });
  try {
    const { bytes, filename } = await renderPayfxDocument(order, { kind, brand, itemId: sp.get("item") ?? undefined });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new NextResponse("Document not found", { status: 404 });
  }
}
