import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { site } from "@/lib/site";
import { formatDate, formatNumber } from "@/lib/format";

const GREEN = rgb(0.059, 0.247, 0.176);
const LIME = rgb(0.804, 0.961, 0.282);
const GREY = rgb(0.39, 0.45, 0.53);
const DARK = rgb(0.06, 0.09, 0.16);

/** Standard PDF fonts only support WinAnsi; strip anything else (e.g. ₦, emoji). */
const safe = (s: string | null | undefined) =>
  (s ?? "").replace(/₦/g, "NGN ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
const ngn = (n: number | string | null | undefined) => `NGN ${formatNumber(Number(n ?? 0))}`;

interface Ctx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

function text(c: Ctx, s: string, x: number, size = 10, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; right?: boolean } = {}) {
  const f = opts.bold ? c.bold : c.font;
  const str = safe(s);
  const width = f.widthOfTextAtSize(str, size);
  c.page.drawText(str, { x: opts.right ? x - width : x, y: c.y, size, font: f, color: opts.color ?? DARK });
}

async function base(title: string, number: string, date: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${title} ${number}`);
  doc.setAuthor(site.name);
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const c: Ctx = { page, font, bold, y: 0 };

  page.drawRectangle({ x: 0, y: 761, width: 595.28, height: 81, color: GREEN });
  c.y = 800;
  text(c, site.name, 40, 22, { bold: true, color: LIME });
  text(c, title.toUpperCase(), 555, 18, { bold: true, color: rgb(1, 1, 1), right: true });
  c.y = 780;
  text(c, "Pay for anything online, in any currency", 40, 9, { color: rgb(0.85, 0.95, 0.88) });
  text(c, `${number}  |  ${date}`, 555, 9, { color: rgb(0.85, 0.95, 0.88), right: true });

  c.y = 735;
  text(c, site.name, 40, 9, { bold: true });
  c.y -= 12; text(c, site.address, 40, 8, { color: GREY });
  c.y -= 11; text(c, `${site.email}  |  ${site.phone}  |  ${site.rcNumber}`, 40, 8, { color: GREY });
  return { doc, c };
}

function footer(c: Ctx, note: string) {
  c.page.drawLine({ start: { x: 40, y: 70 }, end: { x: 555, y: 70 }, thickness: 0.5, color: GREY });
  c.y = 56;
  text(c, note, 40, 8, { color: GREY });
  c.y = 44;
  text(c, "Legal requests only. Card details are processed by our PCI-DSS compliant payment partners and never stored by us.", 40, 7, { color: GREY });
}

export interface InvoiceData {
  kind: "invoice" | "receipt";
  number: string;
  date: string;
  billTo: { name: string; email?: string | null; phone?: string | null; organisation?: string | null };
  request: { reference: string; title: string; type: string };
  quote: { foreign_amount: number; currency: string; exchange_rate: number; subtotal_ngn: number; service_fee_ngn: number; shipping_fee_ngn: number; other_fees_ngn: number; total_ngn: number };
  payment?: { reference: string; provider: string; channel?: string | null; paid_at?: string | null; amount_paid_ngn?: number | null };
}

export async function renderInvoicePdf(d: InvoiceData): Promise<Buffer> {
  const { doc, c } = await base(d.kind === "invoice" ? "Invoice" : "Receipt", d.number, formatDate(d.date));

  c.y = 680;
  text(c, d.kind === "invoice" ? "BILL TO" : "RECEIVED FROM", 40, 8, { bold: true, color: GREY });
  text(c, "ORDER", 330, 8, { bold: true, color: GREY });
  c.y -= 15;
  text(c, d.billTo.organisation || d.billTo.name, 40, 11, { bold: true });
  text(c, d.request.reference, 330, 11, { bold: true });
  c.y -= 13;
  if (d.billTo.organisation) { text(c, `Attn: ${d.billTo.name}`, 40, 9); }
  text(c, d.request.title.slice(0, 48), 330, 9);
  c.y -= 12;
  if (d.billTo.email) text(c, d.billTo.email, 40, 9, { color: GREY });
  text(c, d.request.type === "item" ? "Item purchase & shipping" : "Service payment", 330, 9, { color: GREY });
  c.y -= 12;
  if (d.billTo.phone) text(c, d.billTo.phone, 40, 9, { color: GREY });

  // Table
  c.y = 590;
  c.page.drawRectangle({ x: 40, y: c.y - 6, width: 515, height: 22, color: rgb(0.94, 0.98, 0.95) });
  c.y += 1;
  text(c, "Description", 50, 9, { bold: true });
  text(c, "Amount", 545, 9, { bold: true, right: true });
  const q = d.quote;
  const rows: [string, string][] = [
    [`${d.request.title.slice(0, 60)} (${q.currency} ${formatNumber(Number(q.foreign_amount))} @ NGN ${formatNumber(Number(q.exchange_rate))})`, ngn(q.subtotal_ngn)],
    ["Service fee", ngn(q.service_fee_ngn)],
  ];
  if (Number(q.shipping_fee_ngn) > 0) rows.push(["International shipping", ngn(q.shipping_fee_ngn)]);
  if (Number(q.other_fees_ngn) > 0) rows.push(["Other fees", ngn(q.other_fees_ngn)]);
  c.y -= 26;
  for (const [label, amount] of rows) {
    text(c, label, 50, 9);
    text(c, amount, 545, 9, { right: true });
    c.y -= 8;
    c.page.drawLine({ start: { x: 40, y: c.y }, end: { x: 555, y: c.y }, thickness: 0.3, color: rgb(0.85, 0.88, 0.9) });
    c.y -= 14;
  }
  c.y -= 4;
  c.page.drawRectangle({ x: 330, y: c.y - 8, width: 225, height: 28, color: GREEN });
  c.y += 1;
  text(c, d.kind === "invoice" ? "TOTAL DUE" : "TOTAL PAID", 342, 10, { bold: true, color: LIME });
  text(c, ngn(d.kind === "receipt" ? d.payment?.amount_paid_ngn ?? q.total_ngn : q.total_ngn), 545, 11, { bold: true, color: rgb(1, 1, 1), right: true });

  if (d.payment) {
    c.y -= 50;
    text(c, "PAYMENT DETAILS", 40, 8, { bold: true, color: GREY });
    const lines = [
      `Status: ${d.kind === "receipt" ? "PAID" : "Paid in full"}`,
      `Provider: ${d.payment.provider}${d.payment.channel ? ` (${d.payment.channel})` : ""}`,
      `Payment reference: ${d.payment.reference}`,
      `Paid on: ${formatDate(d.payment.paid_at, true)}`,
    ];
    for (const l of lines) { c.y -= 14; text(c, l, 40, 9); }
  }

  footer(c, `Thank you for choosing ${site.name}. Questions? ${site.email}`);
  return Buffer.from(await doc.save());
}

export interface StatementData {
  organisation: { name: string; rc_number?: string | null; address?: string | null };
  month: string; // YYYY-MM
  payments: { paid_at: string; reference: string; request_reference: string; title: string; amount: number }[];
}

export async function renderStatementPdf(d: StatementData): Promise<Buffer> {
  const label = new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const { doc, c } = await base("Statement", label, formatDate(new Date()));
  let page = c.page;
  c.y = 680;
  text(c, "ORGANISATION", 40, 8, { bold: true, color: GREY });
  c.y -= 15; text(c, d.organisation.name, 40, 12, { bold: true });
  if (d.organisation.rc_number) { c.y -= 13; text(c, d.organisation.rc_number, 40, 9, { color: GREY }); }
  if (d.organisation.address) { c.y -= 12; text(c, d.organisation.address, 40, 9, { color: GREY }); }

  c.y = 600;
  const header = () => {
    page.drawRectangle({ x: 40, y: c.y - 6, width: 515, height: 22, color: rgb(0.94, 0.98, 0.95) });
    c.y += 1;
    text(c, "Date", 50, 9, { bold: true });
    text(c, "Order", 130, 9, { bold: true });
    text(c, "Description", 210, 9, { bold: true });
    text(c, "Amount", 545, 9, { bold: true, right: true });
    c.y -= 26;
  };
  header();
  let total = 0;
  for (const p of d.payments) {
    if (c.y < 110) {
      page = doc.addPage([595.28, 841.89]);
      c.page = page;
      c.y = 790;
      header();
    }
    total += Number(p.amount);
    text(c, formatDate(p.paid_at), 50, 8);
    text(c, p.request_reference, 130, 8);
    text(c, p.title.slice(0, 50), 210, 8);
    text(c, ngn(p.amount), 545, 8, { right: true });
    c.y -= 18;
  }
  if (!d.payments.length) { text(c, "No payments in this period.", 50, 9, { color: GREY }); c.y -= 18; }
  c.y -= 6;
  page.drawRectangle({ x: 330, y: c.y - 8, width: 225, height: 28, color: GREEN });
  c.y += 1;
  text(c, `TOTAL (${d.payments.length} payments)`, 342, 9, { bold: true, color: LIME });
  text(c, ngn(total), 545, 11, { bold: true, color: rgb(1, 1, 1), right: true });
  footer(c, `Monthly statement generated by ${site.name}.`);
  return Buffer.from(await doc.save());
}
