import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { LOGOS } from "./icons";
import { gatewayName } from "./catalog";
import type { PayfxLine, PayfxOrder } from "./store";
import { site } from "@/lib/site";

/**
 * PayFX documents: invoice or receipt, branded either with the Web Purchase
 * logo (whole order) or with an item's own logo (one document per item).
 * Item-branded documents still state clearly that they are issued by
 * Web Purchase (Zero6ix Limited); the brand logo identifies the product paid for.
 */
export type DocKind = "invoice" | "receipt";
export type DocBrand = "webpurchase" | "item";

const GREEN = rgb(0.059, 0.247, 0.176);
const LIME = rgb(0.804, 0.961, 0.282);
const GREY = rgb(0.42, 0.45, 0.5);
const DARK = rgb(0.07, 0.09, 0.15);
const LINE = rgb(0.88, 0.9, 0.92);
const WHITE = rgb(1, 1, 1);

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

/** Web Purchase "W" mark (matches the site logo). */
function drawWpMark(page: PDFPage, x: number, yTop: number, size: number) {
  page.drawRectangle({ x, y: yTop - size, width: size, height: size, color: LIME });
  page.drawSvgPath("M14 20l7 24 11-18 11 18 7-24", { x: x + size * 0.05, y: yTop - size * 0.05, scale: (size * 0.9) / 64, borderColor: GREEN, borderWidth: size * 0.1 });
}

export function documentNumber(order: PayfxOrder, kind: DocKind, itemIndex?: number) {
  const base = kind === "receipt" ? order.invoiceNumber.replace(/^INV/i, "RCT") : order.invoiceNumber;
  return itemIndex === undefined ? base : `${base}-${itemIndex + 1}`;
}

export async function renderPayfxDocument(order: PayfxOrder, opts: { kind: DocKind; brand: DocBrand; itemId?: string }): Promise<{ bytes: Uint8Array; filename: string }> {
  const itemIndex = opts.brand === "item" ? order.items.findIndex((l) => l.id === opts.itemId) : undefined;
  if (opts.brand === "item" && (itemIndex === undefined || itemIndex < 0)) throw new Error("Unknown item");
  const lines: PayfxLine[] = itemIndex === undefined ? order.items : [order.items[itemIndex]];
  const brandItem = itemIndex === undefined ? null : order.items[itemIndex];
  const paid = order.status === "paid";
  const receipt = opts.kind === "receipt";
  const number = documentNumber(order, opts.kind, itemIndex);
  const total = itemIndex === undefined ? order.total : brandItem!.amount;
  const ngnTotal = itemIndex === undefined ? order.ngnTotal : brandItem!.ngnAmount;
  const title = receipt ? "RECEIPT" : "INVOICE";

  const doc = await PDFDocument.create();
  doc.setTitle(`${receipt ? "Receipt" : "Invoice"} ${number}`);
  doc.setAuthor(site.company);
  doc.setCreator(site.name);
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, M = 40;
  const t = (s: string, x: number, y: number, size = 10, o: { f?: PDFFont; c?: RGB; right?: boolean } = {}) => {
    const f = o.f ?? font; const str = clean(s);
    page.drawText(str, { x: o.right ? x - f.widthOfTextAtSize(str, size) : x, y, size, font: f, color: o.c ?? DARK });
  };

  // ---------------- Header ----------------
  if (!brandItem) {
    page.drawRectangle({ x: 0, y: 761, width: W, height: 81, color: GREEN });
    drawWpMark(page, M, 818, 30);
    t(site.name, M + 40, 798, 20, { f: bold, c: LIME });
    t(`${site.company}${site.rcNumber ? ` (${site.rcNumber})` : ""}`, M + 40, 781, 9, { c: rgb(0.85, 0.95, 0.88) });
    t(title, W - M, 803, 18, { f: bold, c: WHITE, right: true });
    t(number, W - M, 783, 10, { c: rgb(0.85, 0.95, 0.88), right: true });
  } else {
    const color = hexToRgb(LOGOS[brandItem.logo].color === "#000000" ? "#111111" : LOGOS[brandItem.logo].color);
    page.drawRectangle({ x: 0, y: 836, width: W, height: 6, color });
    page.drawRectangle({ x: M, y: 762, width: 58, height: 58, color: rgb(0.97, 0.98, 0.98), borderColor: LINE, borderWidth: 1 });
    drawLogo(page, brandItem.logo, M + 11, 811, 36);
    t(`${brandItem.name}${brandItem.subtitle ? ` (${brandItem.subtitle})` : ""}`, M + 72, 800, 17, { f: bold });
    t(`${receipt ? "Receipt" : "Invoice"} for ${brandItem.period.toLowerCase() === "one time" ? "a one-time service" : `${brandItem.period} of service`}`, M + 72, 783, 9.5, { c: GREY });
    t(`Issued by ${site.name} (${site.company}${site.rcNumber ? `, ${site.rcNumber}` : ""})`, M + 72, 769, 8.5, { c: GREY });
    t(title, W - M, 803, 18, { f: bold, c: DARK, right: true });
    t(number, W - M, 785, 10, { c: GREY, right: true });
    page.drawLine({ start: { x: M, y: 750 }, end: { x: W - M, y: 750 }, thickness: 0.8, color: LINE });
  }

  // ---------------- Status stamp ----------------
  const stamp = receipt ? "PAID" : paid ? "PAID" : "UNPAID";
  const ok = stamp === "PAID";
  const sw = bold.widthOfTextAtSize(stamp, 12) + 20;
  page.drawRectangle({ x: W - M - sw, y: 718, width: sw, height: 22, color: ok ? rgb(0.86, 0.98, 0.9) : rgb(1, 0.95, 0.85), borderColor: ok ? rgb(0.09, 0.6, 0.35) : rgb(0.85, 0.55, 0.1), borderWidth: 1 });
  t(stamp, W - M - sw / 2 - bold.widthOfTextAtSize(stamp, 12) / 2, 725, 12, { f: bold, c: ok ? rgb(0.05, 0.45, 0.25) : rgb(0.6, 0.35, 0.02) });

  // ---------------- Parties & details ----------------
  let y = 722;
  t(receipt ? "RECEIVED FROM" : "BILLED TO", M, y, 8, { f: bold, c: GREY });
  t("DETAILS", 300, y, 8, { f: bold, c: GREY });
  const billed = [order.customer.company, order.customer.name, order.customer.email, order.customer.phone].filter(Boolean);
  const details = receipt
    ? [
        `Receipt date: ${dateStr(order.paidAt)}`,
        `Invoice: ${documentNumber(order, "invoice", itemIndex)}`,
        `Paid via: ${gatewayName(order.gateway)}${order.channel ? ` (${order.channel})` : ""}`,
        ...(order.transactionId ? [`Transaction ID: ${order.transactionId}`] : []),
      ]
    : [
        `Issued: ${dateStr(order.createdAt)}`,
        `Payment: ${gatewayName(order.gateway)}${order.channel ? ` (${order.channel})` : ""}`,
        paid ? `Paid: ${dateStr(order.paidAt)}` : "Status: awaiting payment",
        ...(order.transactionId ? [`Transaction ID: ${order.transactionId}`] : []),
      ];
  billed.forEach((l, i) => t(l, M, y - 15 - i * 13, i === 0 ? 11 : 9.5, { f: i === 0 ? bold : font }));
  details.forEach((l, i) => t(l, 300, y - 15 - i * 13, 9.5));
  y -= 20 + Math.max(billed.length, details.length) * 13 + 18;

  // ---------------- Lines ----------------
  const header = () => {
    page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: rgb(0.94, 0.98, 0.95) });
    t("ITEM", M + 44, y, 8, { f: bold, c: GREY });
    t("PERIOD", 360, y, 8, { f: bold, c: GREY });
    t("AMOUNT", W - M - 8, y, 8, { f: bold, c: GREY, right: true });
    y -= 30;
  };
  header();
  for (const line of lines) {
    const purpose = wrap(line.purpose, font, 8, 270);
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

  // ---------------- Totals ----------------
  y -= 6;
  const band = brandItem ? DARK : GREEN;
  page.drawRectangle({ x: 320, y: y - 10, width: W - M - 320, height: 30, color: band });
  t(receipt ? "AMOUNT RECEIVED" : paid ? "TOTAL PAID" : "TOTAL DUE", 332, y, 10, { f: bold, c: brandItem ? WHITE : LIME });
  t(moneyPdf(total, order.currency), W - M - 10, y, 12, { f: bold, c: WHITE, right: true });
  y -= 28;
  const rate = order.rate || 1365;
  const equiv = order.currency === "NGN"
    ? `Approx. USD ${amt(total / rate)} at US$1 = NGN ${amt(rate)}`
    : `Charged in ${order.currency} at US$1 = NGN ${amt(rate)} (NGN ${amt(ngnTotal)})`;
  t(equiv, W - M, y, 8.5, { c: GREY, right: true });
  if (brandItem && order.items.length > 1) {
    y -= 14;
    t(`Part of ${documentNumber(order, opts.kind)} (${order.items.length} items, ${moneyPdf(order.total, order.currency)} in total).`, W - M, y, 8.5, { c: GREY, right: true });
  }
  if (receipt) {
    y -= 30;
    t("Thank you for your payment. This receipt confirms the amount above was received in full.", M, y, 9.5);
  }

  // ---------------- Footer ----------------
  page.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 0.5, color: GREY });
  t(`${site.name}, a service of ${site.company}${site.rcNumber ? ` (${site.rcNumber})` : ""}. ${site.address}`, M, 56, 7.5, { c: GREY });
  t(`${site.email} | ${site.phone} | Payments processed by Flutterwave or Paystack; card details are never stored by us.`, M, 44, 7.5, { c: GREY });
  if (brandItem) t(`${LOGOS[brandItem.logo].title} name and logo identify the product paid for; this document is issued by ${site.name}, not by ${LOGOS[brandItem.logo].title}.`, M, 32, 6.5, { c: GREY });

  const brandSlug = brandItem ? `-${brandItem.id}` : "";
  return { bytes: await doc.save(), filename: `${number}${brandSlug}.pdf` };
}

/** Back-compat: Web Purchase invoice for the whole order. */
export async function renderPayfxInvoice(order: PayfxOrder) {
  return (await renderPayfxDocument(order, { kind: "invoice", brand: "webpurchase" })).bytes;
}
