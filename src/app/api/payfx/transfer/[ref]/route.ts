import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getOrder, linkExpired, updateOrder } from "@/lib/payfx/store";
import { getBankSettings, RECEIPT_MAX_BYTES, storeReceipt, transferAvailable } from "@/lib/payfx/transfer";
import { adminEmails } from "@/lib/payfx/admin-auth";
import { money } from "@/lib/payfx/catalog";
import { validateFile, UploadError } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { publicSiteUrl } from "@/lib/payfx/site-url";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Per-instance throttle: 8 uploads per IP per hour.
const hits = new Map<string, number[]>();
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= 8;
}

/** Customer uploads their bank transfer receipt for an unpaid Naira invoice. */
export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "Too many uploads. Please wait a while or contact us." }, { status: 429 });

  const bank = await getBankSettings();
  if (!transferAvailable(bank)) return NextResponse.json({ error: "Bank transfer is not available right now. Please contact us." }, { status: 503 });

  const order = await getOrder(ref).catch(() => null);
  if (!order) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });
  if (order.currency !== "NGN") return NextResponse.json({ error: "Bank transfer is for Naira invoices only." }, { status: 400 });
  if (linkExpired(order)) return NextResponse.json({ error: "This payment link has expired. Please contact us." }, { status: 410 });
  if ((order.transfer?.receipts?.length ?? 0) >= 5) return NextResponse.json({ error: "We already have several receipts for this invoice. Please contact us." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("receipt");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Attach your transfer receipt (photo, screenshot or PDF)." }, { status: 400 });
  let checked;
  try {
    checked = await validateFile(file, RECEIPT_MAX_BYTES);
  } catch (e) {
    return NextResponse.json({ error: e instanceof UploadError ? e.message : "That file can't be used." }, { status: 400 });
  }
  const senderName = String(form?.get("sender_name") ?? "").trim().slice(0, 120);
  const note = String(form?.get("note") ?? "").trim().slice(0, 500);

  const uploadedAt = new Date().toISOString();
  const path = `${order.ref}/${uploadedAt.replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}.${checked.sig.ext}`;
  try {
    await storeReceipt(path, checked.bytes, checked.sig.mime);
  } catch (e) {
    console.error("[payfx] receipt upload failed", e);
    return NextResponse.json({ error: "We couldn't save your receipt. Please try again, or email it to us." }, { status: 502 });
  }

  const receipts = [...(order.transfer?.receipts ?? []), { path, name: checked.name, mime: checked.sig.mime, size: file.size, uploadedAt, senderName: senderName || undefined, note: note || undefined }];
  await updateOrder(order.ref, {
    transfer: { ...(order.transfer ?? {}), status: "submitted", receipts, rejectedReason: undefined },
  });

  const base = await publicSiteUrl();
  const total = money(order.total, order.currency);
  const ops = [...new Set([...adminEmails(), (process.env.CONTACT_FORM_TO ?? "").trim()].filter(Boolean))];
  await Promise.allSettled([
    sendEmail({
      to: ops,
      subject: `Transfer receipt to confirm: ${order.invoiceNumber} (${total})`,
      heading: "A customer uploaded a bank transfer receipt",
      paragraphs: [
        `${order.customer.name} (${order.customer.email}) says they transferred ${total} for invoice ${order.invoiceNumber}.`,
        ...(senderName ? [`Sent from account name: ${senderName}`] : []),
        ...(note ? [`Note: ${note}`] : []),
        `Check your ${bank.bank} account (${bank.accountNumber}) for the credit, then confirm or reject it in the admin.`,
      ],
      cta: { label: "Review receipt", url: `${base}/checkout-admin/orders/${order.ref}` },
    }),
    sendEmail({
      to: order.customer.email,
      subject: `We received your transfer receipt for ${order.invoiceNumber}`,
      heading: `Thanks, ${order.customer.name.split(" ")[0] || "there"}`,
      paragraphs: [
        `We received your receipt for ${total} (invoice ${order.invoiceNumber}).`,
        "We'll check our account and confirm your payment shortly, usually within a few hours during business days. You'll get an email with your receipt once it's confirmed.",
      ],
      cta: { label: "View your invoice", url: `${base}/checkout/link/${order.ref}` },
    }),
  ]);

  return NextResponse.json({ ok: true, message: `Receipt received. We'll confirm your payment and email ${order.customer.email}.`, site: site.name });
}
