"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import {
  ADMIN_BASE, adminConfigured, checkPassword, createLoginToken, emailLoginEnabled, endSession, isAdminEmail,
  loginThrottle, passwordLoginEnabled, readLoginToken, requireAdmin, startSession, usedNonces,
} from "@/lib/payfx/admin-auth";
import {
  createProduct, deleteMessage, deleteOrder, deleteProduct, getProduct, logAdmin, nonceUsed, setSetting,
  StoreError, updateMessage, updateProduct, type MessageStatus,
} from "@/lib/payfx/admin-store";
import { createOrder, getOrder, newOrderRef, storeConfigured, updateOrder } from "@/lib/payfx/store";
import { GATEWAYS } from "@/lib/payfx/gateways";
import { confirmPayment } from "@/lib/payfx/orders";
import { convert, gatewayName, money, round2 } from "@/lib/payfx/catalog";
import { getProductsById, PRODUCTS_TAG } from "@/lib/payfx/products";
import { getRateInfo, getUsdRate, MARKET_TAG, SETTINGS_TAG } from "@/lib/payfx/settings";
import { LOGOS } from "@/lib/payfx/icons";
import { sendEmail } from "@/lib/email";
import { publicSiteUrl as siteUrl } from "@/lib/payfx/site-url";
import { site } from "@/lib/site";
import { zodErrorState, type ActionState } from "@/lib/validation";

const back = (path: string, params: Record<string, string>) => `${ADMIN_BASE}${path}?${new URLSearchParams(params)}`;
const errText = (e: unknown, fallback = "Something went wrong. Please try again.") =>
  e instanceof StoreError
    ? e.code === "42P01" || e.code === "PGRST205"
      ? "A database table is missing. Run supabase/leadloop/checkout_admin.sql in the Supabase SQL editor (leadloop project)."
      : e.message
    : fallback;

/* ================= Sign in / out ================= */

const LINK_SENT = "If that email belongs to an admin, a sign-in link is on its way. It works once and expires in 15 minutes. Check spam if you don't see it.";

export async function loginAction(_: ActionState | null, form: FormData): Promise<ActionState> {
  if (!adminConfigured()) return { error: "Admin sign-in is not set up yet (no email service or password configured)." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const pw = String(form.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter your email address.", fieldErrors: { email: ["Enter a valid email"] } };

  const throttle = await loginThrottle();
  if (throttle.blocked) return { error: "Too many attempts. Try again in 15 minutes." };
  throttle.hit();
  await new Promise((r) => setTimeout(r, 300));

  if (pw) {
    if (!passwordLoginEnabled()) return { error: "Password sign-in is off. Leave the password empty to get an email link." };
    if (!isAdminEmail(email) || !checkPassword(pw)) return { error: "Wrong email or password." };
    throttle.reset();
    await startSession(email);
    await logAdmin(email, "sign_in", null, { method: "password" });
    redirect(ADMIN_BASE);
  }

  if (!emailLoginEnabled()) return { error: "Email sign-in links need RESEND_API_KEY. Use the password instead." };
  if (isAdminEmail(email)) {
    const url = `${await siteUrl()}${ADMIN_BASE}/auth?t=${encodeURIComponent(createLoginToken(email))}`;
    const sent = await sendEmail({
      to: email,
      subject: `Your ${site.name} admin sign-in link`,
      heading: "Sign in to the checkout admin",
      paragraphs: [
        "Click the button below to sign in. The link works once and expires in 15 minutes.",
        "If you did not ask for this, you can ignore this email. Nobody can sign in without the link.",
      ],
      cta: { label: "Sign in", url },
    });
    console.info(`[checkout-admin] sign-in link for ${email}: ${sent ? "handed to Resend" : "SEND FAILED"}`);
    if (!sent) return { error: "We could not send the email right now. Please try again in a minute." };
  } else {
    console.warn(`[checkout-admin] sign-in link requested for a non-admin email: ${email.replace(/^(.).*(@.*)$/, "$1***$2")}`);
  }
  return { ok: true, message: LINK_SENT };
}

/** Second step of an email link: a button press (so email scanners can't use up the link). */
export async function confirmLinkAction(form: FormData) {
  const token = String(form.get("t") ?? "");
  const info = readLoginToken(token);
  if (!info) redirect(back("/login", { e: "expired" }));
  if (usedNonces.has(info.nonce) || (await nonceUsed(info.nonce))) redirect(back("/login", { e: "used" }));
  usedNonces.add(info.nonce);
  await startSession(info.email);
  await logAdmin(info.email, "sign_in", null, { method: "email_link", nonce: info.nonce });
  redirect(ADMIN_BASE);
}

export async function logoutAction() {
  await endSession();
  redirect(`${ADMIN_BASE}/login`);
}

/* ================= Items ================= */

const ProductSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  subtitle: z.string().trim().max(60).optional().transform((v) => v || null),
  period: z.string().trim().min(2, "Enter a period, e.g. 12 months or One time").max(40),
  purpose: z.string().trim().min(5, "Describe what the payment is for").max(400),
  amount_ngn: z.string().trim()
    .transform((v) => Number(v.replace(/[₦,\s]/g, "")))
    .pipe(z.number({ message: "Enter an amount" }).positive("Amount must be more than 0").max(1_000_000_000, "Amount is too large")),
  logo: z.string().refine((v) => v in LOGOS && v !== "test", "Choose a logo"),
  sort_order: z.string().trim().optional().transform((v) => (v ? Math.round(Number(v)) : 0)).pipe(z.number().int("Enter a whole number")),
  active: z.string().optional().transform((v) => v === "on"),
});

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function refreshItems() {
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/checkout");
  revalidatePath(ADMIN_BASE, "layout");
}

export async function saveProductAction(_: ActionState | null, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = ProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const existingId = String(form.get("id") ?? "");
  try {
    if (existingId) {
      const before = await getProduct(existingId);
      const row = await updateProduct(existingId, parsed.data);
      if (!row) return { error: "This item no longer exists." };
      const changed = before ? Object.keys(parsed.data).filter((k) => String(before[k as keyof typeof before]) !== String(parsed.data[k as keyof typeof parsed.data])) : [];
      await logAdmin(admin, "item_updated", existingId, { name: row.name, changed, ...(changed.includes("amount_ngn") ? { from: before?.amount_ngn, to: row.amount_ngn } : {}) });
    } else {
      let id = slug([parsed.data.name, parsed.data.subtitle].filter(Boolean).join(" ")) || "item";
      if (id.length < 2) id = `item-${id}`;
      for (let n = 2; await getProduct(id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
      await createProduct(id, parsed.data);
      await logAdmin(admin, "item_added", id, { name: parsed.data.name, amount_ngn: parsed.data.amount_ngn });
    }
  } catch (e) {
    return { error: errText(e) };
  }
  refreshItems();
  redirect(back("/items", { saved: "1" }));
}

export async function deleteProductAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  try {
    const before = await getProduct(id);
    await deleteProduct(id);
    await logAdmin(admin, "item_deleted", id, { name: before?.name, amount_ngn: before?.amount_ngn });
  } catch (e) {
    redirect(back("/items", { error: errText(e, "Delete failed.") }));
  }
  refreshItems();
  redirect(back("/items", { deleted: "1" }));
}

export async function toggleProductAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const active = form.get("active") === "true";
  try {
    await updateProduct(id, { active });
    await logAdmin(admin, active ? "item_shown" : "item_hidden", id);
  } catch (e) {
    redirect(back("/items", { error: errText(e, "Update failed.") }));
  }
  refreshItems();
  redirect(`${ADMIN_BASE}/items`);
}

/* ================= Orders ================= */

const orderPath = (ref: string) => `/orders/${encodeURIComponent(ref)}`;

export async function verifyOrderAction(form: FormData) {
  const admin = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  let msg: Record<string, string>;
  try {
    const before = await getOrder(ref);
    if (!before) redirect(back("/orders", { error: "Order not found." }));
    if (before.status === "paid") msg = { notice: "This order is already marked as paid." };
    else {
      const after = await confirmPayment(before.payRef, before.transactionId);
      if (after?.status === "paid") {
        await logAdmin(admin, "order_verified_paid", ref, { invoice: before.invoiceNumber, gateway: before.gateway });
        msg = { notice: `${gatewayName(before.gateway)} confirmed the payment. The order is now paid.` };
      } else {
        msg = { error: `${gatewayName(before.gateway)} has no successful payment for this invoice yet. If the customer paid another way, use "Mark as paid".` };
      }
    }
  } catch (e) {
    unstable_rethrow(e);
    msg = { error: errText(e, "Could not reach the payment gateway. Try again.") };
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(back(orderPath(ref), msg));
}

const ManualPaid = z.object({
  ref: z.string().min(6),
  method: z.enum(["bank_transfer", "cash", "pos", "other"]),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});
const METHOD_LABEL = { bank_transfer: "Bank transfer", cash: "Cash", pos: "POS", other: "Other" } as const;

export async function markPaidAction(form: FormData) {
  const admin = await requireAdmin();
  const p = ManualPaid.safeParse(Object.fromEntries(form));
  const ref = String(form.get("ref") ?? "");
  if (!p.success) redirect(back(orderPath(ref), { error: "Choose how the customer paid." }));
  try {
    const order = await getOrder(ref);
    if (!order) redirect(back("/orders", { error: "Order not found." }));
    if (order.status !== "paid") {
      await updateOrder(ref, {
        status: "paid",
        paidAt: new Date().toISOString(),
        paidRef: p.data.reference || "MANUAL",
        channel: `${METHOD_LABEL[p.data.method]} (recorded by admin)`,
        transactionId: p.data.reference || undefined,
        manualPayment: { method: p.data.method, reference: p.data.reference ?? "", note: p.data.note ?? "", by: admin },
      });
      await logAdmin(admin, "order_marked_paid", ref, { invoice: order.invoiceNumber, method: p.data.method, reference: p.data.reference, note: p.data.note });
    }
  } catch (e) {
    unstable_rethrow(e);
    redirect(back(orderPath(ref), { error: errText(e) }));
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(back(orderPath(ref), { notice: "Marked as paid. The receipt is now available." }));
}

export async function markUnpaidAction(form: FormData) {
  const admin = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  try {
    const order = await getOrder(ref);
    if (order?.status === "paid") {
      await updateOrder(ref, { status: "pending", paidAt: undefined, paidRef: undefined, channel: undefined, transactionId: undefined });
      await logAdmin(admin, "order_marked_unpaid", ref, { invoice: order.invoiceNumber });
    }
  } catch (e) {
    redirect(back(orderPath(ref), { error: errText(e) }));
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(back(orderPath(ref), { notice: "Order set back to unpaid." }));
}

export async function emailCustomerAction(form: FormData) {
  const admin = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  const kind = form.get("kind") === "receipt" ? "receipt" : "invoice";
  let msg: Record<string, string>;
  try {
    const order = await getOrder(ref);
    if (!order) redirect(back("/orders", { error: "Order not found." }));
    if (kind === "receipt" && order.status !== "paid") redirect(back(orderPath(ref), { error: "The receipt is only available once the order is paid." }));
    const base = await siteUrl();
    const first = order.customer.name.split(" ")[0] || "there";
    const total = money(order.total, order.currency);
    const ok = await sendEmail({
      to: order.customer.email,
      subject: kind === "receipt" ? `Receipt ${order.invoiceNumber} from ${site.name}` : `Invoice ${order.invoiceNumber} from ${site.name}`,
      heading: kind === "receipt" ? `Thank you, ${first}` : `Hello ${first}`,
      paragraphs: kind === "receipt"
        ? [`We have received your payment of ${total} for invoice ${order.invoiceNumber}.`, "You can view and download your receipt using the button below."]
        : [`Here is your invoice ${order.invoiceNumber} for ${total}.`, "You can view it, download a PDF, or pay online using the button below."],
      cta: kind === "receipt"
        ? { label: "View receipt", url: `${base}/checkout/invoice/${order.ref}` }
        : { label: `View and pay ${total}`, url: `${base}/checkout/link/${order.ref}` },
    });
    if (!ok) msg = { error: "The email could not be sent. Check that RESEND_API_KEY is set." };
    else {
      await logAdmin(admin, `order_${kind}_emailed`, ref, { invoice: order.invoiceNumber, to: order.customer.email });
      msg = { notice: `${kind === "receipt" ? "Receipt" : "Invoice"} emailed to ${order.customer.email}.` };
    }
  } catch (e) {
    unstable_rethrow(e);
    msg = { error: errText(e) };
  }
  redirect(back(orderPath(ref), msg));
}

export async function saveOrderNoteAction(form: FormData) {
  const admin = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  try {
    await updateOrder(ref, { adminNote: note });
    await logAdmin(admin, "order_note_saved", ref);
  } catch (e) {
    redirect(back(orderPath(ref), { error: errText(e) }));
  }
  redirect(back(orderPath(ref), { notice: "Note saved." }));
}

export async function deleteOrderAction(form: FormData) {
  const admin = await requireAdmin();
  const ref = String(form.get("ref") ?? "");
  try {
    const order = await getOrder(ref);
    if (!order) redirect(back("/orders", { error: "Order not found." }));
    if (order.status === "paid") redirect(back(orderPath(ref), { error: "Paid orders cannot be deleted. Set it back to unpaid first if it was a mistake." }));
    await deleteOrder(ref);
    await logAdmin(admin, "order_deleted", ref, { invoice: order.invoiceNumber, email: order.customer.email, total: order.total, currency: order.currency });
  } catch (e) {
    unstable_rethrow(e);
    redirect(back(orderPath(ref), { error: errText(e) }));
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(back("/orders", { notice: "Order deleted." }));
}

/* ================= Messages ================= */

export async function messageStatusAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as MessageStatus;
  const ret = String(form.get("return") ?? "/messages");
  if (!["new", "read", "replied", "archived"].includes(status)) redirect(`${ADMIN_BASE}/messages`);
  try {
    await updateMessage(id, { status });
    await logAdmin(admin, `message_${status}`, id);
  } catch (e) {
    redirect(back("/messages", { error: errText(e) }));
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(`${ADMIN_BASE}${ret.startsWith("/") ? ret : "/messages"}`);
}

export async function messageNoteAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  try {
    await updateMessage(id, { notes: String(form.get("notes") ?? "").trim().slice(0, 2000) || null });
    await logAdmin(admin, "message_note_saved", id);
  } catch (e) {
    redirect(back("/messages", { error: errText(e) }));
  }
  redirect(back("/messages", { notice: "Note saved." }));
}

export async function deleteMessageAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  try {
    await deleteMessage(id);
    await logAdmin(admin, "message_deleted", id);
  } catch (e) {
    redirect(back("/messages", { error: errText(e) }));
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(back("/messages", { notice: "Message deleted." }));
}

/* ================= Settings ================= */

export async function saveRateAction(_: ActionState | null, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const mode = form.get("rate_mode") === "live" ? "live" : "fixed";
  const num = (k: string) => Number(String(form.get(k) ?? "").replace(/[₦,%\s]/g, ""));
  const rate = num("usd_rate");
  const markup = num("rate_markup");
  if (!Number.isFinite(rate) || rate < 100 || rate > 100000) return { error: "Enter a fixed rate between ₦100 and ₦100,000 per US$1. It's also the backup if live rates are unavailable.", fieldErrors: { usd_rate: ["Invalid rate"] } };
  if (!Number.isFinite(markup) || markup < 0 || markup > 50) return { error: "Markup must be between 0% and 50%.", fieldErrors: { rate_markup: ["Invalid markup"] } };
  try {
    await setSetting("rate_mode", mode, admin);
    await setSetting("usd_rate", Math.round(rate * 100) / 100, admin);
    await setSetting("rate_markup", Math.round(markup * 100) / 100, admin);
    await logAdmin(admin, "usd_rate_changed", "usd_rate", { mode, to: rate, markup });
  } catch (e) {
    return { error: errText(e) };
  }
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/checkout");
  revalidatePath(ADMIN_BASE, "layout");
  const info = await getRateInfo();
  return {
    ok: true,
    message: mode === "live"
      ? info.fallback
        ? `Saved. Live mode is on, but the market rate can't be reached right now, so checkout is using your fixed rate of ₦${rate.toLocaleString("en-US")} until it can.`
        : `Saved. Checkout now uses the live rate: ₦${info.rate.toLocaleString("en-US")} per US$1 (market ₦${info.market?.toLocaleString("en-US")} + ${markup}%). It updates every 15 minutes.`
      : `Saved. Checkout now uses a fixed rate of ₦${rate.toLocaleString("en-US")} per US$1. Existing invoices keep their rate.`,
  };
}

export async function refreshRateAction(): Promise<ActionState> {
  const admin = await requireAdmin();
  revalidateTag(MARKET_TAG);
  revalidatePath("/checkout");
  const info = await getRateInfo();
  await logAdmin(admin, "rate_refreshed", "usd_rate", { market: info.market, rate: info.rate });
  if (!info.market) return { error: "Couldn't reach the exchange-rate service. Try again in a minute." };
  return { ok: true, message: `Market rate refreshed: ₦${info.market.toLocaleString("en-US")} per US$1. Checkout charges ₦${info.rate.toLocaleString("en-US")}.` };
}

export async function testEmailAction(): Promise<ActionState> {
  const admin = await requireAdmin();
  const ok = await sendEmail({
    to: admin,
    subject: `Test email from ${site.name} admin`,
    heading: "Email is working",
    paragraphs: ["This test was sent from the checkout admin settings page."],
  });
  return ok ? { ok: true, message: `Test email sent to ${admin}.` } : { error: "Sending failed. Check RESEND_API_KEY and the Resend domain." };
}

/* ================= Payment links ================= */

const LinkSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email (Paystack needs it for the receipt)").max(160),
  phone: z.string().trim().max(40).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  currency: z.enum(["NGN", "USD"]).default("NGN"),
  message: z.string().trim().max(500).optional().default(""),
  expires_days: z.string().optional().transform((v) => Math.max(0, Math.min(90, Math.round(Number(v) || 0)))),
  send_email: z.string().optional().transform((v) => v === "on"),
});

export async function createPaymentLinkAction(_: ActionState | null, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = LinkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const d = parsed.data;

  if (!GATEWAYS.paystack.configured()) return { error: "Paystack is not connected yet. Add PAYSTACK_SECRET_KEY in Vercel and redeploy." };
  if (!GATEWAYS.paystack.currencies().includes(d.currency)) return { error: `Your Paystack account is set up for ${GATEWAYS.paystack.currencies().join(", ")} only. Choose NGN.` };
  if (!storeConfigured()) return { error: "The database key is not set, so the link can't be saved." };

  const [products, usdRate] = await Promise.all([getProductsById(), getUsdRate()]);
  const fieldErrors: Record<string, string[]> = {};

  const catalog = form.getAll("items").map(String).filter((id) => products.has(id)).map((id) => {
    const i = products.get(id)!;
    return { id, name: i.name, subtitle: i.subtitle, period: i.period, purpose: i.purpose, ngnAmount: i.amount, logo: i.logo };
  });

  const custom: typeof catalog = [];
  for (let n = 0; n < 5; n++) {
    const desc = String(form.get(`custom_desc_${n}`) ?? "").trim().slice(0, 120);
    const rawAmt = String(form.get(`custom_amount_${n}`) ?? "").replace(/[₦,\s]/g, "");
    if (!desc && !rawAmt) continue;
    const amt = Number(rawAmt);
    if (!desc) { fieldErrors[`custom_desc_${n}`] = ["Describe what this payment is for"]; continue; }
    if (!Number.isFinite(amt) || amt < 100 || amt > 500_000_000) { fieldErrors[`custom_amount_${n}`] = ["Enter an amount of at least ₦100"]; continue; }
    custom.push({
      id: `custom-${n + 1}`, name: desc, subtitle: undefined,
      period: String(form.get(`custom_period_${n}`) ?? "").trim().slice(0, 40) || "One time",
      purpose: String(form.get(`custom_note_${n}`) ?? "").trim().slice(0, 300) || `Payment requested by ${site.name}.`,
      ngnAmount: Math.round(amt * 100) / 100, logo: "other",
    });
  }
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors };
  const picked = [...catalog, ...custom];
  if (!picked.length) return { error: "Add at least one item: pick from the list or enter a custom amount." };

  const lines = picked.map((l) => ({ ...l, amount: convert(l.ngnAmount, d.currency, usdRate) }));
  const ref = newOrderRef();
  const expiresAt = d.expires_days ? new Date(Date.now() + d.expires_days * 86_400_000).toISOString() : undefined;
  let invoiceNumber = "";
  try {
    const order = await createOrder({
      ref,
      status: "pending",
      gateway: "paystack",
      payRef: ref,
      customer: { name: d.name, email: d.email, phone: d.phone, company: d.company },
      currency: d.currency,
      rate: usdRate,
      items: lines,
      total: round2(lines.reduce((s, l) => s + l.amount, 0)),
      ngnTotal: lines.reduce((s, l) => s + l.ngnAmount, 0),
      createdAt: new Date().toISOString(),
      source: "admin-link",
      link: { createdBy: admin, message: d.message || undefined, expiresAt },
    });
    invoiceNumber = order.invoiceNumber;
    await logAdmin(admin, "link_created", ref, { invoice: invoiceNumber, to: d.email, total: order.total, currency: d.currency });

    if (d.send_email) {
      const url = `${await siteUrl()}/checkout/link/${ref}`;
      const sent = await sendEmail({
        to: d.email,
        subject: `Payment request ${invoiceNumber} from ${site.name}`,
        heading: `Hello ${d.name.split(" ")[0]}`,
        paragraphs: [
          `${site.name} has sent you a payment request of ${money(order.total, order.currency)} (invoice ${invoiceNumber}).`,
          ...(d.message ? [d.message] : []),
          "Tap the button to see the details and pay securely with Paystack by card, bank transfer or USSD.",
          ...(expiresAt ? [`This link expires on ${new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`] : []),
          `Genuine ${site.name} links always start with ${(process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/$/, "")}/checkout/. We will never ask for your card PIN or OTP.`,
        ],
        cta: { label: `Pay ${money(order.total, order.currency)}`, url },
      });
      if (sent) await logAdmin(admin, "link_emailed", ref, { invoice: invoiceNumber, to: d.email });
    }
  } catch (e) {
    return { error: errText(e, "Could not create the link. Please try again.") };
  }
  revalidatePath(ADMIN_BASE, "layout");
  redirect(back(`/links/${encodeURIComponent(ref)}`, { created: "1", ...(d.send_email ? { emailed: "1" } : {}) }));
}
