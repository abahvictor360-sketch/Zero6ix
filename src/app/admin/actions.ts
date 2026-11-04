"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { computeQuote } from "@/lib/pricing";
import { randomToken, decryptSecret } from "@/lib/crypto";
import { notifyRequestEvent, type NotificationEvent } from "@/lib/notifications";
import { fileFrom, uploadFile, UploadError, signedUrl } from "@/lib/storage";
import { allowedTransitions } from "@/lib/status";
import { syncRatesFromApi } from "@/lib/rates";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { formToObject, quoteSchema, zodErrorState, type ActionState } from "@/lib/validation";
import type { FeeSettings, RequestRow, RequestStatus, ShippingRate } from "@/lib/types";

const uuid = z.string().uuid();

async function loadRequest(id: string) {
  const { data } = await createAdminClient().from("requests").select("*").eq("id", id).single<RequestRow>();
  if (!data) throw new Error("Request not found");
  return data;
}

async function addEvent(requestId: string, status: RequestStatus | null, title: string, note: string | null, actorId: string, visible = true) {
  await createAdminClient().from("request_events").insert({ request_id: requestId, status, title, note, actor_id: actorId, visible_to_client: visible });
}

const fail = (e: unknown): ActionState => ({ error: e instanceof Error ? e.message : "Something went wrong." });

// ---------------------------------------------------------------------------
// Review: approve / reject / status changes
// ---------------------------------------------------------------------------
export async function approveForReview(form: FormData) {
  const staff = await requireStaff("requests.manage");
  const id = uuid.parse(form.get("request_id"));
  const r = await loadRequest(id);
  if (!["submitted", "draft"].includes(r.status)) return;
  if (r.status === "draft" && !r.legal_confirmed) throw new Error("Draft has no legal confirmation.");
  await createAdminClient().from("requests").update({ status: "under_review", assigned_to: staff.id }).eq("id", id);
  await addEvent(id, "under_review", "Under review", "Our team has confirmed your request is eligible and is preparing your quote.", staff.id);
  await audit(staff, "request.approve_review", "request", id, { from: r.status });
  revalidatePath(`/admin/requests/${id}`);
}

export async function rejectRequest(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("requests.manage");
    const parsed = z.object({ request_id: uuid, reason: z.string().trim().min(5, "Give the client a clear reason").max(1000) }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const { request_id: id, reason } = parsed.data;
    const r = await loadRequest(id);
    if (!allowedTransitions(r.status, r.type).includes("rejected")) return { error: `Cannot reject a request that is ${r.status}.` };
    const db = createAdminClient();
    await db.from("requests").update({ status: "rejected", rejection_reason: reason }).eq("id", id);
    await db.from("quotes").update({ status: "cancelled" }).eq("request_id", id).eq("status", "active");
    await addEvent(id, "rejected", "Request not accepted", reason, staff.id);
    await audit(staff, "request.reject", "request", id, { reason });
    await notifyRequestEvent(id, "request_rejected", { reason });
    revalidatePath(`/admin/requests/${id}`);
    return { ok: true, message: "Request rejected and client notified." };
  } catch (e) { return fail(e); }
}

const STATUS_EVENT: Partial<Record<RequestStatus, NotificationEvent>> = {
  processing: "processing", completed: "order_completed", shipped: "item_shipped", delivered: "item_delivered", refunded: "refunded",
};

export async function updateStatus(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("requests.manage");
    const parsed = z.object({
      request_id: uuid,
      status: z.enum(["draft", "submitted", "under_review", "quote_sent", "paid", "processing", "completed", "shipped", "delivered", "rejected", "refunded", "cancelled"]),
      note: z.string().trim().max(1000).optional(),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const { request_id: id, status, note } = parsed.data;
    const r = await loadRequest(id);
    if (!allowedTransitions(r.status, r.type).includes(status)) return { error: `Cannot move from ${r.status} to ${status}.` };
    if (status === "shipped") {
      const { data: s } = await createAdminClient().from("shipments").select("tracking_number").eq("request_id", id).maybeSingle();
      if (!s?.tracking_number) return { error: "Add a tracking number before marking as shipped." };
    }
    const db = createAdminClient();
    await db.from("requests").update({ status }).eq("id", id);
    if (status === "refunded") await db.from("payments").update({ status: "refunded" }).eq("request_id", id).eq("status", "success");
    if (status === "delivered") await db.from("shipments").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("request_id", id);
    if (status === "cancelled") await db.from("quotes").update({ status: "cancelled" }).eq("request_id", id).eq("status", "active");
    const titles: Partial<Record<RequestStatus, string>> = { processing: "Processing — paying the vendor", completed: "Completed", shipped: "Shipped", delivered: "Delivered", refunded: "Refunded", under_review: "Under review", cancelled: "Cancelled" };
    await addEvent(id, status, titles[status] ?? status, note ?? null, staff.id);
    await audit(staff, "request.status", "request", id, { from: r.status, to: status, note });
    const event = STATUS_EVENT[status];
    if (event) {
      const { data: s } = await db.from("shipments").select("carrier, tracking_number").eq("request_id", id).maybeSingle();
      await notifyRequestEvent(id, event, { carrier: s?.carrier, trackingNumber: s?.tracking_number });
    }
    revalidatePath(`/admin/requests/${id}`);
    return { ok: true, message: `Status updated to ${status.replace("_", " ")}.` };
  } catch (e) { return fail(e); }
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
export async function sendQuote(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("quotes.send");
    const parsed = quoteSchema.safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const d = parsed.data;
    const r = await loadRequest(d.request_id);
    if (!["under_review", "quote_sent"].includes(r.status)) return { error: "Move the request to 'Under review' before sending a quote." };
    if (r.flagged && form.get("override_flag") !== "on") return { error: "This request is flagged. Confirm you've reviewed the flags to continue." };

    const db = createAdminClient();
    const [{ data: rateRow }, { data: usdRow }, { data: fees }] = await Promise.all([
      db.from("exchange_rates").select("sell_rate").eq("currency", d.currency).single(),
      db.from("exchange_rates").select("sell_rate").eq("currency", "USD").single(),
      db.from("fee_settings").select("*").eq("id", 1).single<FeeSettings>(),
    ]);
    if (!fees) return { error: "Fee settings missing." };
    const sellRate = d.exchange_rate ?? Number(rateRow?.sell_rate ?? 0);
    let shipping = null;
    if (r.type === "item" && d.weight_kg > 0) {
      const { data: ship } = await db.from("shipping_rates").select("*").eq("origin_region", d.origin_region ?? r.origin_region ?? "US").single<ShippingRate>();
      if (!ship || !usdRow) return { error: "No shipping rate for that origin." };
      shipping = { weightKg: d.weight_kg, rate: ship, usdSellRate: Number(usdRow.sell_rate) };
    }
    const q = computeQuote({ amount: d.foreign_amount, currency: d.currency, sellRate, fees, shipping, otherFeesNgn: d.other_fees_ngn });

    // Supersede any active quote, then create the new one (DB enforces one active per request).
    await db.from("quotes").update({ status: "superseded" }).eq("request_id", r.id).in("status", ["active", "expired"]);
    const expiresAt = new Date(Date.now() + Number(fees.quote_validity_hours) * 3600_000).toISOString();
    const { data: quote, error } = await db.from("quotes").insert({
      request_id: r.id,
      foreign_amount: q.foreignAmount,
      currency: q.currency,
      exchange_rate: q.exchangeRate,
      subtotal_ngn: q.subtotalNgn,
      service_fee_ngn: q.serviceFeeNgn,
      shipping_fee_ngn: q.shippingFeeNgn,
      other_fees_ngn: q.otherFeesNgn,
      total_ngn: q.totalNgn,
      breakdown: { serviceFeeRule: q.serviceFeeRule, shippingRule: q.shippingRule, weightKg: d.weight_kg, rateOverridden: d.exchange_rate != null },
      notes: d.notes ?? null,
      payment_token: randomToken(24),
      expires_at: expiresAt,
      created_by: staff.id,
    }).select("*").single();
    if (error || !quote) return { error: "Could not create quote." };

    await db.from("requests").update({ status: "quote_sent", requires_kyc: Number(q.totalNgn) >= Number(fees.kyc_threshold_ngn) || r.requires_kyc }).eq("id", r.id);
    if (r.type === "item" && d.weight_kg > 0) {
      await db.from("shipments").upsert({ request_id: r.id, weight_kg: d.weight_kg }, { onConflict: "request_id" });
    }
    await addEvent(r.id, "quote_sent", r.status === "quote_sent" ? "Quote re-issued" : "Quote sent", `Total ₦${q.totalNgn.toLocaleString("en-NG")} — rate locked for ${fees.quote_validity_hours} hours.`, staff.id);
    await audit(staff, r.status === "quote_sent" ? "quote.reissue" : "quote.send", "quote", quote.id, { request: r.reference, total: q.totalNgn, rate: q.exchangeRate, flaggedOverride: r.flagged });
    await notifyRequestEvent(r.id, "quote_ready", { quote });
    revalidatePath(`/admin/requests/${r.id}`);
    return { ok: true, message: `Quote of ₦${q.totalNgn.toLocaleString("en-NG")} sent. Payment link is live for ${fees.quote_validity_hours}h.` };
  } catch (e) { return fail(e); }
}

// ---------------------------------------------------------------------------
// Proofs, shipments, messages, credentials
// ---------------------------------------------------------------------------
export async function uploadProof(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("requests.manage");
    const parsed = z.object({
      request_id: uuid,
      kind: z.enum(["receipt", "screenshot", "proof_of_payment", "proof_of_delivery", "license_key", "invoice", "other"]),
      visible_to_client: z.string().optional(),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const file = fileFrom(form, "file");
    if (!file) return { error: "Choose a file." };
    const up = await uploadFile("attachments", parsed.data.request_id, file);
    await createAdminClient().from("attachments").insert({
      request_id: parsed.data.request_id, kind: parsed.data.kind, storage_path: up.path, file_name: up.name,
      mime_type: up.mime, size_bytes: up.size, uploaded_by: staff.id, visible_to_client: parsed.data.visible_to_client === "on",
    });
    await audit(staff, "attachment.upload", "request", parsed.data.request_id, { kind: parsed.data.kind, file: up.name });
    revalidatePath(`/admin/requests/${parsed.data.request_id}`);
    return { ok: true, message: "File uploaded." };
  } catch (e) { return e instanceof UploadError ? { error: e.message } : fail(e); }
}

export async function saveShipment(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("requests.manage");
    const parsed = z.object({
      request_id: uuid,
      carrier: z.string().trim().max(80).optional(),
      tracking_number: z.string().trim().max(80).optional(),
      tracking_url: z.string().trim().max(500).optional().refine((v) => !v || /^https?:\/\//.test(v), "Must be a URL"),
      status: z.enum(["awaiting_purchase", "purchased", "at_warehouse", "in_transit", "customs", "out_for_delivery", "delivered", "exception"]),
      foreign_warehouse: z.string().trim().max(200).optional(),
      estimated_delivery: z.string().optional(),
      weight_kg: z.coerce.number().nonnegative().max(500).optional(),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const d = parsed.data;
    const db = createAdminClient();
    const { data: existing } = await db.from("shipments").select("tracking_number, status").eq("request_id", d.request_id).maybeSingle();
    await db.from("shipments").upsert({
      request_id: d.request_id, carrier: d.carrier || null, tracking_number: d.tracking_number || null, tracking_url: d.tracking_url || null,
      status: d.status, foreign_warehouse: d.foreign_warehouse || null, estimated_delivery: d.estimated_delivery || null, weight_kg: d.weight_kg ?? null,
      shipped_at: d.status === "in_transit" && existing?.status !== "in_transit" ? new Date().toISOString() : undefined,
    }, { onConflict: "request_id" });
    if (d.tracking_number && d.tracking_number !== existing?.tracking_number) {
      await addEvent(d.request_id, null, "Tracking number added", `${d.carrier ?? "Courier"}: ${d.tracking_number}`, staff.id);
    } else if (existing?.status !== d.status) {
      await addEvent(d.request_id, null, `Shipment: ${d.status.replace(/_/g, " ")}`, null, staff.id);
    }
    await audit(staff, "shipment.update", "request", d.request_id, d);
    revalidatePath(`/admin/requests/${d.request_id}`);
    return { ok: true, message: "Shipment saved." };
  } catch (e) { return fail(e); }
}

export async function staffMessage(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("requests.message");
    const parsed = z.object({ request_id: uuid, body: z.string().trim().min(1).max(4000), internal: z.string().optional() }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const internal = parsed.data.internal === "on";
    await createAdminClient().from("messages").insert({ request_id: parsed.data.request_id, sender_id: staff.id, is_staff: true, internal, body: parsed.data.body });
    if (!internal) await notifyRequestEvent(parsed.data.request_id, "new_message", { message: parsed.data.body });
    revalidatePath(`/admin/requests/${parsed.data.request_id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function revealCredentials(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("credentials.view");
    const id = uuid.parse(form.get("request_id"));
    const { data } = await createAdminClient().from("request_credentials").select("ciphertext").eq("request_id", id).maybeSingle();
    if (!data) return { error: "No credentials stored (the client may have deleted them)." };
    const creds = JSON.parse(decryptSecret(data.ciphertext)) as { username: string; password: string; extra: string };
    await audit(staff, "credentials.view", "request", id);
    return { ok: true, data: creds };
  } catch (e) { return fail(e); }
}

// ---------------------------------------------------------------------------
// Rates & fees
// ---------------------------------------------------------------------------
export async function saveRate(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("rates.manage");
    const parsed = z.object({
      currency: z.string().regex(/^[A-Z]{3}$/),
      name: z.string().trim().min(2).max(60),
      symbol: z.string().trim().max(5).optional(),
      buy_rate: z.coerce.number().positive(),
      sell_rate: z.coerce.number().positive(),
      source: z.enum(["manual", "api"]),
      markup_percent: z.coerce.number().min(0).max(50),
      is_active: z.string().optional(),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const d = parsed.data;
    if (d.sell_rate < d.buy_rate) return { error: `Sell rate is below buy rate for ${d.currency} — this would lose money on every order.` };
    const db = createAdminClient();
    const { data: before } = await db.from("exchange_rates").select("buy_rate, sell_rate, source, markup_percent").eq("currency", d.currency).maybeSingle();
    await db.from("exchange_rates").upsert({ ...d, symbol: d.symbol ?? "", is_active: d.is_active === "on", updated_by: staff.id, updated_at: new Date().toISOString() });
    await audit(staff, "rate.update", "exchange_rate", d.currency, { before, after: d });
    revalidatePath("/admin/rates");
    return { ok: true, message: `${d.currency} saved.` };
  } catch (e) { return fail(e); }
}

export async function syncRatesNow(): Promise<ActionState> {
  try {
    const staff = await requireStaff("rates.manage");
    const result = await syncRatesFromApi();
    await audit(staff, "rate.sync", "exchange_rate", null, result);
    revalidatePath("/admin/rates");
    return { ok: true, message: `Updated ${result.updated.length} API-sourced currencies${result.updated.length ? `: ${result.updated.join(", ")}` : ""}.` };
  } catch (e) { return fail(e); }
}

export async function saveFees(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("fees.manage");
    const parsed = z.object({
      percentage_fee: z.coerce.number().min(0).max(50),
      flat_fee_ngn: z.coerce.number().min(0),
      minimum_fee_ngn: z.coerce.number().min(0),
      kyc_threshold_ngn: z.coerce.number().min(0),
      quote_validity_hours: z.coerce.number().int().min(1).max(168),
      bh_start: z.string().regex(/^\d{2}:\d{2}$/),
      bh_end: z.string().regex(/^\d{2}:\d{2}$/),
      bh_saturday_end: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const d = parsed.data;
    const days = form.getAll("bh_days").map(Number).filter((n) => n >= 0 && n <= 6);
    const db = createAdminClient();
    const { data: before } = await db.from("fee_settings").select("*").eq("id", 1).single();
    const after = {
      id: 1, percentage_fee: d.percentage_fee, flat_fee_ngn: d.flat_fee_ngn, minimum_fee_ngn: d.minimum_fee_ngn,
      kyc_threshold_ngn: d.kyc_threshold_ngn, quote_validity_hours: d.quote_validity_hours,
      business_hours: { timezone: "Africa/Lagos", days, start: d.bh_start, end: d.bh_end, saturday_end: d.bh_saturday_end || undefined },
      updated_by: staff.id, updated_at: new Date().toISOString(),
    };
    await db.from("fee_settings").upsert(after);
    await audit(staff, "fees.update", "fee_settings", "1", { before, after });
    revalidatePath("/admin/fees");
    return { ok: true, message: "Fee settings saved." };
  } catch (e) { return fail(e); }
}

export async function saveShippingRate(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("fees.manage");
    const parsed = z.object({
      origin_region: z.string().trim().toUpperCase().regex(/^[A-Z]{2,4}$/),
      label: z.string().trim().min(3).max(80),
      rate_per_kg_usd: z.coerce.number().min(0),
      min_charge_usd: z.coerce.number().min(0),
      delivery_days_min: z.coerce.number().int().min(1),
      delivery_days_max: z.coerce.number().int().min(1),
      is_active: z.string().optional(),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const d = { ...parsed.data, is_active: parsed.data.is_active === "on", updated_at: new Date().toISOString() };
    await createAdminClient().from("shipping_rates").upsert(d, { onConflict: "origin_region" });
    await audit(staff, "shipping_rate.update", "shipping_rate", d.origin_region, d);
    revalidatePath("/admin/fees");
    return { ok: true, message: `${d.origin_region} shipping saved.` };
  } catch (e) { return fail(e); }
}

// ---------------------------------------------------------------------------
// KYC, contacts, keywords, team
// ---------------------------------------------------------------------------
export async function reviewKyc(form: FormData) {
  const staff = await requireStaff("kyc.review");
  const id = uuid.parse(form.get("doc_id"));
  const decision = z.enum(["approved", "rejected"]).parse(form.get("decision"));
  const notes = z.string().max(500).optional().parse(form.get("notes") || undefined);
  const db = createAdminClient();
  const { data: doc } = await db.from("kyc_documents").update({ status: decision, reviewer_id: staff.id, review_notes: notes ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id).select("user_id, organisation_id").single();
  if (doc) {
    const status = decision === "approved" ? "verified" : "rejected";
    if (doc.organisation_id) await db.from("organisations").update({ kyc_status: status }).eq("id", doc.organisation_id);
    else await db.from("users").update({ kyc_status: status }).eq("id", doc.user_id);
    await db.from("notifications").insert({
      user_id: doc.user_id,
      title: decision === "approved" ? "ID verified ✅" : "ID verification unsuccessful",
      body: decision === "approved" ? "Your account is fully verified." : `Please upload a clearer, valid document.${notes ? ` Note: ${notes}` : ""}`,
      link: "/dashboard/profile#kyc",
      event: "kyc",
    });
  }
  await audit(staff, `kyc.${decision}`, "kyc_document", id, { notes });
  revalidatePath("/admin/customers");
}

export async function getKycDocumentUrl(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("kyc.review");
    const id = uuid.parse(form.get("doc_id"));
    const { data } = await createAdminClient().from("kyc_documents").select("storage_path").eq("id", id).single();
    if (!data) return { error: "Not found" };
    await audit(staff, "kyc.view", "kyc_document", id);
    return { ok: true, data: { url: await signedUrl("kyc", data.storage_path, 120) } };
  } catch (e) { return fail(e); }
}

export async function updateContactStatus(form: FormData) {
  const staff = await requireStaff("contacts.view");
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["new", "in_progress", "resolved", "spam"]).parse(form.get("status"));
  await createAdminClient().from("contact_submissions").update({ status, handled_by: staff.id }).eq("id", id);
  await audit(staff, "contact.status", "contact_submission", id, { status });
  revalidatePath("/admin/contacts");
}

export async function addKeyword(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("keywords.manage");
    const parsed = z.object({
      keyword: z.string().trim().toLowerCase().min(2).max(60),
      category: z.string().trim().min(2).max(40),
      severity: z.enum(["flag", "block"]),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const { error } = await createAdminClient().from("prohibited_keywords").insert({ ...parsed.data, created_by: staff.id });
    if (error) return { error: error.code === "23505" ? "Keyword already exists." : "Could not add keyword." };
    await audit(staff, "keyword.add", "prohibited_keyword", parsed.data.keyword, parsed.data);
    revalidatePath("/admin/keywords");
    return { ok: true, message: `"${parsed.data.keyword}" added.` };
  } catch (e) { return fail(e); }
}

export async function deleteKeyword(form: FormData) {
  const staff = await requireStaff("keywords.manage");
  const id = uuid.parse(form.get("id"));
  const { data } = await createAdminClient().from("prohibited_keywords").delete().eq("id", id).select("keyword").single();
  await audit(staff, "keyword.delete", "prohibited_keyword", data?.keyword ?? id);
  revalidatePath("/admin/keywords");
}

export async function setUserRole(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("team.manage");
    const parsed = z.object({
      email: z.string().trim().toLowerCase().email(),
      role: z.enum(["client", "support", "operations", "super_admin"]),
    }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const db = createAdminClient();
    const { data: target } = await db.from("users").select("id, role, email").ilike("email", parsed.data.email).maybeSingle();
    if (!target) return { error: "No user with that email. Ask them to sign up first." };
    if (target.id === staff.id) return { error: "You can't change your own role." };
    if (target.role === "super_admin" && parsed.data.role !== "super_admin") {
      const { count } = await db.from("users").select("id", { count: "exact", head: true }).eq("role", "super_admin");
      if ((count ?? 0) <= 1) return { error: "There must be at least one Super Admin." };
    }
    await db.from("users").update({ role: parsed.data.role }).eq("id", target.id);
    await audit(staff, "team.role", "user", target.id, { email: target.email, from: target.role, to: parsed.data.role });
    revalidatePath("/admin/team");
    return { ok: true, message: `${target.email} is now ${parsed.data.role.replace("_", " ")}. They'll need to set up 2FA on next admin login.` };
  } catch (e) { return fail(e); }
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------
export async function replyWhatsApp(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff("whatsapp.reply");
    const parsed = z.object({ conversation_id: uuid, body: z.string().trim().min(1).max(4000) }).safeParse(formToObject(form));
    if (!parsed.success) return zodErrorState(parsed.error);
    const db = createAdminClient();
    const { data: conv } = await db.from("whatsapp_conversations").select("wa_id, last_inbound_at").eq("id", parsed.data.conversation_id).single();
    if (!conv) return { error: "Conversation not found." };
    if (!conv.last_inbound_at || Date.now() - new Date(conv.last_inbound_at).getTime() > 24 * 3600_000) {
      return { error: "The 24-hour WhatsApp window has closed. The customer must message first, or use an approved template." };
    }
    await sendWhatsAppText(conv.wa_id, parsed.data.body, { sentBy: staff.id });
    await db.from("whatsapp_conversations").update({ assigned_to: staff.id }).eq("id", parsed.data.conversation_id);
    await audit(staff, "whatsapp.reply", "whatsapp_conversation", parsed.data.conversation_id);
    revalidatePath(`/admin/whatsapp`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function resolveHandoff(form: FormData) {
  const staff = await requireStaff("whatsapp.reply");
  const id = uuid.parse(form.get("conversation_id"));
  await createAdminClient().from("whatsapp_conversations").update({ handoff: false, state: "menu", state_data: {} }).eq("id", id);
  await audit(staff, "whatsapp.resolve", "whatsapp_conversation", id);
  revalidatePath("/admin/whatsapp");
}
