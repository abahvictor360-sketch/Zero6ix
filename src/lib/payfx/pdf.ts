import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGOS } from "./icons";
import { gatewayName } from "./catalog";
import type { PayfxOrder } from "./store";
import { site } from "@/lib/site";

const GREEN = rgb(0.059, 0.247, 0.176);
const LIME = rgb(0.804, 0.961, 0.282);
const GREY = rgb(0.42, 0.45, 0.5);
const DARK = rgb(0.07, 0.09, 0.15);
const LINE = rgb(0.88, 0.9, 0.92);

/** Built-in PDF fonts have no ₦ glyph and limited charset: use codes and strip the rest. */
const clean = (s: string | null | undefined) => (s ?? "").replace(/₦/g, "NGN ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
const amt = (n: number) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyPdf = (n: number, c: string) => `${c} ${amt(n)}`;
const dateStr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "-");

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawLogo(page: PDFPage, key: keyof typeof LOGOS, x: number, yTop: number, size: number) {
  const l = LOGOS[key];
  const scale = size / 24;
  for (const d of l.paths) {
    if (l.kind === "fill") page.drawSvgPath(d, { x, y: yTop, scale, color: hexToRgb(l.color === "#000000" ? "#111111" : l.color) });
    else page.drawSvgPath(d, { x, y: yTop, scale, borderColor: hexToRgb(l.color), borderWidth: 1.8 * scale });
  }
}

export async function renderPayfxInvoice(order: PayfxOrder): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${order.invoiceNumber}`);
  doc.setAuthor(site.company);
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, M = 40;
  const t = (s: string, x: number, y: number, size = 10, o: { f?: PDFFont; c?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const f = o.f ?? font; const str = clean(s);
    page.drawText(str, { x: o.right ? x - f.widthOfTextAtSize(str, size) : x, y, size, font: f, color: o.c ?? DARK });
  };
  const paid = order.status === "paid";

  // Header band
  page.drawRectangle({ x: 0, y: 761, width: W, height: 81, color: GREEN });
  t(site.name, M, 803, 22, { f: bold, c: LIME });
  t(`${site.company}${site.rcNumber ? ` (${site.rcNumber})` : ""}`, M, 783, 9, { c: rgb(0.85, 0.95, 0.88) });
  t("INVOICE", W - M, 803, 18, { f: bold, c: rgb(1, 1, 1), right: true });
  t(order.invoiceNumber, W - M, 783, 10, { c: rgb(0.85, 0.95, 0.88), right: true });

  // Status stamp
  const stamp = paid ? "PAID" : "UNPAID";
  const sw = bold.widthOfTextAtSize(stamp, 12) + 20;
  page.drawRectangle({ x: W - M - sw, y: 722, width: sw, height: 22, color: paid ? rgb(0.86, 0.98, 0.9) : rgb(1, 0.95, 0.85), borderColor: paid ? rgb(0.09, 0.6, 0.35) : rgb(0.85, 0.55, 0.1), borderWidth: 1 });
  t(stamp, W - M - sw / 2 - bold.widthOfTextAtSize(stamp, 12) / 2, 729, 12, { f: bold, c: paid ? rgb(0.05, 0.45, 0.25) : rgb(0.6, 0.35, 0.02) });

  // Billed to / details
  let y = 725;
  t("BILLED TO", M, y, 8, { f: bold, c: GREY });
  t("DETAILS", 330, y, 8, { f: bold, c: GREY });
  const billed = [order.customer.company, order.customer.name, order.customer.email, order.customer.phone].filter(Boolean);
  const details = [
    `Issued: ${dateStr(order.createdAt)}`,
    `Payment: ${gatewayName(order.gateway)}${order.channel ? ` (${order.channel})` : ""}`,
    paid ? `Paid: ${dateStr(order.paidAt)}` : "Status: awaiting payment",
    ...(order.transactionId ? [`Transaction ID: ${order.transactionId}`] : []),
  ];
  billed.forEach((l, i) => t(l, M, y - 15 - i * 13, i === 0 ? 11 : 9.5, { f: i === 0 ? bold : font }));
  details.forEach((l, i) => t(l, 330, y - 15 - i * 13, 9.5));
  y -= 20 + Math.max(billed.length, details.length) * 13 + 18;

  // Table
  const header = () => {
    page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: rgb(0.94, 0.98, 0.95) });
    t("ITEM", M + 44, y, 8, { f: bold, c: GREY });
    t("PERIOD", 360, y, 8, { f: bold, c: GREY });
    t("AMOUNT", W - M - 8, y, 8, { f: bold, c: GREY, right: true });
    y -= 30;
  };
  header();
  for (const line of order.items) {
    const purpose = wrap(line.purpose, font, 8, 280);
    const h = 16 + purpose.length * 10 + 8;
    if (y - h < 150) { page = doc.addPage([595.28, 841.89]); y = 790; header(); }
    drawLogo(page, line.logo, M + 8, y + 12, 20);
    t(`${line.name}${line.subtitle ? ` (${line.subtitle})` : ""}`, M + 44, y, 10, { f: bold });
    purpose.forEach((p, i) => t(p, M + 44, y - 13 - i * 10, 8, { c: GREY }));
    t(line.period, 360, y, 9.5);
    t(moneyPdf(line.amount, order.currency), W - M - 8, y, 10, { right: true });
    y -= h;
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.5, color: LINE });
    y -= 6;
  }

  // Totals
  y -= 6;
  page.drawRectangle({ x: 320, y: y - 10, width: W - M - 320, height: 30, color: GREEN });
  t(paid ? "TOTAL PAID" : "TOTAL DUE", 332, y, 10, { f: bold, c: LIME });
  t(moneyPdf(order.total, order.currency), W - M - 10, y, 12, { f: bold, c: rgb(1, 1, 1), right: true });
  y -= 28;
  const rate = order.rate || 1365;
  const equiv = order.currency === "NGN"
    ? `Approx. USD ${amt(order.total / rate)} at US$1 = NGN ${amt(rate)}`
    : `Charged in ${order.currency} at US$1 = NGN ${amt(rate)} (NGN ${amt(order.ngnTotal)})`;
  t(equiv, W - M, y, 8.5, { c: GREY, right: true });

  // Footer
  page.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 0.5, color: GREY });
  t(`${site.name}, a service of ${site.company}${site.rcNumber ? ` (${site.rcNumber})` : ""}. ${site.address}`, M, 56, 7.5, { c: GREY });
  t(`${site.email} | ${site.phone} | Card details are processed by Flutterwave or Paystack and never stored by us.`, M, 44, 7.5, { c: GREY });
  return doc.save();
}
