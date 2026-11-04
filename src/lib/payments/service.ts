import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/site";
import { notifyRequestEvent, notifyStaff } from "@/lib/notifications";
import { renderInvoicePdf, type InvoiceData } from "@/lib/pdf";
import { audit } from "@/lib/audit";
import { formatMoney } from "@/lib/format";
import { getFeeSettings } from "@/lib/settings";
import type { Organisation, Payment, PaymentProvider, Quote, RequestRow, UserProfile } from "@/lib/types";
import { paystackInitialize, paystackVerify, type VerifiedTx } from "./paystack";
import { flutterwaveInitialize, flutterwaveVerify } from "./flutterwave";

export class PaymentError extends Error {}

export interface PayableQuote {
  quote: Quote;
  request: RequestRow;
  user: UserProfile | null;
  organisation: Organisation | null;
  state: "payable" | "expired" | "paid" | "unavailable";
  kycRequired: boolean;
}

/** Load a quote by its unguessable payment-link token and work out whether it can be paid. */
export async function getQuoteByToken(token: string): Promise<PayableQuote | null> {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) return null;
  const db = createAdminClient();
  const { data: quote } = await db.from("quotes").select("*").eq("payment_token", token).maybeSingle<Quote>();
  if (!quote) return null;
  const { data: request } = await db.from("requests").select("*").eq("id", quote.request_id).single<RequestRow>();
  if (!request) return null;

  const [{ data: user }, { data: organisation }] = await Promise.all([
    request.user_id ? db.from("users").select("*").eq("id", request.user_id).maybeSingle<UserProfile>() : Promise.resolve({ data: null }),
    request.organisation_id ? db.from("organisations").select("*").eq("id", request.organisation_id).maybeSingle<Organisation>() : Promise.resolve({ data: null }),
  ]);

  let state: PayableQuote["state"] = "payable";
  if (quote.status === "paid") state = "paid";
  else if (quote.status !== "active" || !["quote_sent", "under_review"].includes(request.status)) state = "unavailable";
  else if (new Date(quote.expires_at).getTime() < Date.now()) {
    state = "expired";
    await db.from("quotes").update({ status: "expired" }).eq("id", quote.id).eq("status", "active");
  }

  const fees = await getFeeSettings();
  const kycVerified = user?.kyc_status === "verified" || organisation?.kyc_status === "verified";
  const kycRequired = Number(quote.total_ngn) >= fees.kyc_threshold_ngn && !kycVerified;

  return { quote, request, user: user as UserProfile | null, organisation: organisation as Organisation | null, state, kycRequired };
}

/** Create a pending payment and return the gateway checkout URL. */
export async function initializePayment(token: string, provider: Exclude<PaymentProvider, "manual">) {
  const pq = await getQuoteByToken(token);
  if (!pq) throw new PaymentError("This payment link is invalid.");
  if (pq.state === "expired") throw new PaymentError("This quote has expired. Please ask us to re-issue it at the current rate.");
  if (pq.state === "paid") throw new PaymentError("This quote has already been paid.");
  if (pq.state !== "payable") throw new PaymentError("This quote is no longer available for payment.");
  if (pq.kycRequired) throw new PaymentError("ID verification is required for orders of this size. Please upload your ID in Profile → Verification.");

  const email = pq.user?.email ?? pq.request.contact_email;
  if (!email) throw new PaymentError("An email address is required to pay. Please sign in or contact support.");

  const reference = `WPP-${pq.request.reference.replace("WP-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const db = createAdminClient();
  const { error } = await db.from("payments").insert({
    quote_id: pq.quote.id,
    request_id: pq.request.id,
    user_id: pq.request.user_id,
    organisation_id: pq.request.organisation_id,
    provider,
    reference,
    amount_ngn: pq.quote.total_ngn,
    status: "pending",
  });
  if (error) throw new PaymentError("Could not start payment. Please try again.");

  const args = {
    email,
    amountNgn: Number(pq.quote.total_ngn),
    reference,
    callbackUrl: absoluteUrl(`/pay/${token}/callback?provider=${provider}`),
    metadata: { request_reference: pq.request.reference, quote_id: pq.quote.id, request_id: pq.request.id },
  };
  try {
    return provider === "paystack"
      ? await paystackInitialize(args)
      : await flutterwaveInitialize({ ...args, name: pq.user?.full_name ?? undefined, phone: pq.user?.phone });
  } catch (err) {
    await db.from("payments").update({ status: "failed" }).eq("reference", reference);
    throw new PaymentError(err instanceof Error ? err.message : "Payment gateway error");
  }
}

export async function verifyWithProvider(provider: PaymentProvider, reference: string): Promise<VerifiedTx> {
  if (provider === "paystack") return paystackVerify(reference);
  if (provider === "flutterwave") return flutterwaveVerify(reference);
  throw new PaymentError("Unsupported provider");
}

/**
 * Verify a transaction with the gateway (never trust redirect params or webhook
 * bodies alone) and mark the order paid. Safe to call repeatedly.
 */
export async function confirmPayment(reference: string): Promise<{ status: "paid" | "already_paid" | "failed" | "pending"; payment?: Payment }> {
  const db = createAdminClient();
  const { data: payment } = await db.from("payments").select("*").eq("reference", reference).maybeSingle<Payment>();
  if (!payment) throw new PaymentError("Unknown payment reference");
  if (payment.status === "success") return { status: "already_paid", payment };

  const tx = await verifyWithProvider(payment.provider, reference);
  if (!tx.ok) {
    return { status: "pending", payment };
  }
  if (tx.amountNgn + 0.01 < Number(payment.amount_ngn)) {
    await db.from("payments").update({ status: "failed", amount_paid_ngn: tx.amountNgn, raw: tx.raw }).eq("id", payment.id);
    await notifyStaff("Underpayment detected", `${reference}: expected ${formatMoney(payment.amount_ngn)}, received ${formatMoney(tx.amountNgn)}`, `/admin/requests/${payment.request_id}`);
    return { status: "failed", payment };
  }

  // Money already taken for this quote by another payment (e.g. two tabs)? Still record it, but alert ops to refund.
  const { data: dup } = await db.from("payments").select("reference").eq("quote_id", payment.quote_id).eq("status", "success").neq("id", payment.id).limit(1);
  if (dup?.length) {
    await notifyStaff("Duplicate payment: refund required", `${reference} paid ${formatMoney(tx.amountNgn)} for a quote already settled by ${dup[0].reference}.`, `/admin/requests/${payment.request_id}`, ["operations", "super_admin"]);
  }

  const { data: changed, error } = await db.rpc("mark_payment_successful", {
    p_reference: reference,
    p_amount_paid: tx.amountNgn,
    p_provider_tx: tx.transactionId,
    p_channel: tx.channel,
    p_raw: tx.raw,
  });
  if (error) throw new PaymentError(error.message);
  if (!changed) return { status: "already_paid", payment };

  await afterPaymentSuccess(payment.id);
  return { status: "paid", payment };
}

export async function buildInvoiceData(paymentId: string, kind: "invoice" | "receipt"): Promise<InvoiceData | null> {
  const db = createAdminClient();
  const { data: p } = await db.from("payments").select("*").eq("id", paymentId).single<Payment>();
  if (!p || p.status !== "success") return null;
  const [{ data: q }, { data: r }] = await Promise.all([
    db.from("quotes").select("*").eq("id", p.quote_id).single<Quote>(),
    db.from("requests").select("*").eq("id", p.request_id).single<RequestRow>(),
  ]);
  if (!q || !r) return null;
  const [{ data: u }, { data: o }] = await Promise.all([
    p.user_id ? db.from("users").select("*").eq("id", p.user_id).maybeSingle<UserProfile>() : Promise.resolve({ data: null }),
    p.organisation_id ? db.from("organisations").select("*").eq("id", p.organisation_id).maybeSingle<Organisation>() : Promise.resolve({ data: null }),
  ]);
  const user = u as UserProfile | null;
  const org = o as Organisation | null;
  return {
    kind,
    number: (kind === "invoice" ? p.invoice_number : p.receipt_number) ?? p.reference,
    date: p.paid_at ?? p.created_at,
    billTo: { name: user?.full_name || user?.email || "Customer", email: user?.email ?? r.contact_email, phone: user?.phone ?? r.contact_phone, organisation: org?.name },
    request: { reference: r.reference, title: r.title, type: r.type },
    quote: q,
    payment: { reference: p.reference, provider: p.provider, channel: p.channel, paid_at: p.paid_at, amount_paid_ngn: p.amount_paid_ngn },
  };
}

async function afterPaymentSuccess(paymentId: string) {
  const db = createAdminClient();
  const { data: payment } = await db.from("payments").select("*").eq("id", paymentId).single<Payment>();
  if (!payment) return;

  const attachments: { filename: string; content: Buffer }[] = [];
  for (const kind of ["invoice", "receipt"] as const) {
    const data = await buildInvoiceData(paymentId, kind);
    if (data) attachments.push({ filename: `${data.number}.pdf`, content: await renderInvoicePdf(data) });
  }

  await Promise.allSettled([
    notifyRequestEvent(payment.request_id, "payment_confirmed", { attachments }),
    notifyStaff("Payment received", `${payment.reference}: ${formatMoney(payment.amount_paid_ngn ?? payment.amount_ngn)} via ${payment.provider}`, `/admin/requests/${payment.request_id}`, ["operations", "super_admin"]),
    audit(null, "payment.confirmed", "payment", payment.id, { reference: payment.reference, amount: payment.amount_paid_ngn, provider: payment.provider }),
  ]);
}
