"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRequest, RequestError } from "@/lib/requests";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { encryptSecret } from "@/lib/crypto";
import { fileFrom, uploadFile, UploadError } from "@/lib/storage";
import { notifyStaff } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { TERMINAL_STATUSES } from "@/lib/status";
import {
  formToObject, itemRequestSchema, messageSchema, organisationSchema, phoneSchema,
  profileSchema, serviceRequestSchema, zodErrorState, type ActionState,
} from "@/lib/validation";
import type { RequestRow } from "@/lib/types";

const requirePhoneVerification = () => process.env.REQUIRE_PHONE_VERIFICATION !== "false";

function assertVerified(user: CurrentUser): ActionState | null {
  if (!user.profile.email_verified) return { error: "Please confirm your email address before submitting requests." };
  if (requirePhoneVerification() && !user.profile.phone_verified) {
    return { error: "Please verify your phone number before submitting requests. Go to Profile → Verify phone." };
  }
  return null;
}

/** Load a request the user can access, or throw. Uses RLS-bound client. */
async function getAccessibleRequest(requestId: string): Promise<RequestRow> {
  const supabase = await createClient();
  const { data } = await supabase.from("requests").select("*").eq("id", requestId).maybeSingle<RequestRow>();
  if (!data) throw new RequestError("Request not found.");
  return data;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
export async function submitServiceRequest(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const unverified = assertVerified(user);
  if (unverified) return unverified;
  const parsed = serviceRequestSchema.safeParse(formToObject(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`req:${user.id}`, LIMITS.createRequest.limit, LIMITS.createRequest.window))) {
    return { error: "You've submitted many requests in the last hour. Please wait a little." };
  }
  const d = parsed.data;
  let request: RequestRow;
  try {
    request = await createRequest(user, {
      type: "service",
      title: d.service_name,
      organisationId: d.organisation_id,
      serviceName: d.service_name,
      websiteUrl: d.website_url,
      accountEmail: d.account_email,
      amount: d.amount,
      currency: d.currency,
      deadline: d.deadline,
      notes: d.notes,
      legalConfirmed: d.legal_confirmed,
    });
  } catch (e) {
    return { error: e instanceof RequestError ? e.message : "Something went wrong." };
  }
  redirect(`/dashboard/requests/${request.id}?created=1`);
}

export async function submitItemRequest(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const unverified = assertVerified(user);
  if (unverified) return unverified;

  // Items arrive as parallel arrays: item_url[], item_qty[] …
  const all = (k: string) => form.getAll(k).map(String);
  const urls = all("item_url");
  const items = urls.map((url, i) => ({
    product_url: url,
    name: all("item_name")[i],
    quantity: all("item_qty")[i] || "1",
    variant: all("item_variant")[i],
    estimated_price: all("item_price")[i] || undefined,
  })).filter((i) => i.product_url.trim() !== "");

  const parsed = itemRequestSchema.safeParse({ ...formToObject(form), items });
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`req:${user.id}`, LIMITS.createRequest.limit, LIMITS.createRequest.window))) {
    return { error: "You've submitted many requests in the last hour. Please wait a little." };
  }
  const d = parsed.data;
  const total = d.items.reduce((s, i) => s + (i.estimated_price ?? 0) * i.quantity, 0);
  const title = d.title || (d.items.length === 1 ? d.items[0].name || "Item purchase" : `${d.items.length} items`);
  let request: RequestRow;
  try {
    request = await createRequest(user, {
      type: "item",
      title,
      organisationId: d.organisation_id,
      amount: total > 0 ? total : undefined,
      currency: d.currency,
      notes: d.notes,
      originRegion: d.origin_region,
      deliveryAddress: { line: d.address_line, city: d.city, state: d.state, phone: d.delivery_phone },
      legalConfirmed: d.legal_confirmed,
      items: d.items,
    });
  } catch (e) {
    return { error: e instanceof RequestError ? e.message : "Something went wrong." };
  }
  redirect(`/dashboard/requests/${request.id}?created=1`);
}

export async function cancelRequest(form: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().parse(form.get("request_id"));
  const request = await getAccessibleRequest(id);
  if (!["submitted", "under_review", "quote_sent", "draft"].includes(request.status)) {
    throw new RequestError("This request can no longer be cancelled.");
  }
  const db = createAdminClient();
  await db.from("requests").update({ status: "cancelled" }).eq("id", id);
  await db.from("quotes").update({ status: "cancelled" }).eq("request_id", id).eq("status", "active");
  await db.from("request_events").insert({ request_id: id, status: "cancelled", title: "Cancelled by client", actor_id: user.id });
  revalidatePath(`/dashboard/requests/${id}`);
}

// ---------------------------------------------------------------------------
// Messages, attachments, credentials
// ---------------------------------------------------------------------------
export async function sendMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = messageSchema.safeParse({ request_id: form.get("request_id"), body: form.get("body") });
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`msg:${user.id}`, LIMITS.message.limit, LIMITS.message.window))) return { error: "Slow down a little — too many messages." };
  let request: RequestRow;
  try {
    request = await getAccessibleRequest(parsed.data.request_id);
  } catch {
    return { error: "Request not found." };
  }

  let attachmentId: string | null = null;
  const file = fileFrom(form, "file");
  if (file) {
    try {
      const up = await uploadFile("attachments", request.id, file);
      const { data } = await createAdminClient().from("attachments").insert({
        request_id: request.id, kind: "client_upload", storage_path: up.path, file_name: up.name, mime_type: up.mime, size_bytes: up.size, uploaded_by: user.id,
      }).select("id").single();
      attachmentId = data?.id ?? null;
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "Upload failed." };
    }
  }

  // Insert through the RLS-bound client: policy enforces sender = auth.uid() and access.
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ request_id: request.id, sender_id: user.id, body: parsed.data.body, attachment_id: attachmentId });
  if (error) return { error: "Could not send message." };
  await notifyStaff(`Message on ${request.reference}`, `${user.profile.full_name}: ${parsed.data.body.slice(0, 200)}`, `/admin/requests/${request.id}`);
  revalidatePath(`/dashboard/requests/${request.id}`);
  return { ok: true };
}

export async function saveCredentials(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({
    request_id: z.string().uuid(),
    username: z.string().trim().min(1, "Enter the login/username").max(200),
    password: z.string().min(1, "Enter the password").max(500),
    extra: z.string().max(1000).optional(),
  }).safeParse(formToObject(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  let request: RequestRow;
  try {
    request = await getAccessibleRequest(parsed.data.request_id);
  } catch {
    return { error: "Request not found." };
  }
  if (TERMINAL_STATUSES.includes(request.status)) return { error: "This request is closed." };

  const ciphertext = encryptSecret(JSON.stringify({ username: parsed.data.username, password: parsed.data.password, extra: parsed.data.extra ?? "" }));
  const { error } = await createAdminClient().from("request_credentials").upsert({ request_id: request.id, ciphertext, created_by: user.id });
  if (error) return { error: "Could not save credentials." };
  await audit(user, "credentials.saved", "request", request.id);
  revalidatePath(`/dashboard/requests/${request.id}`);
  return { ok: true, message: "Credentials encrypted and saved." };
}

export async function deleteCredentials(form: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().parse(form.get("request_id"));
  await getAccessibleRequest(id);
  await createAdminClient().from("request_credentials").delete().eq("request_id", id);
  await audit(user, "credentials.deleted", "request", id);
  revalidatePath(`/dashboard/requests/${id}`);
}

// ---------------------------------------------------------------------------
// Profile, phone verification & KYC
// ---------------------------------------------------------------------------
export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ ...formToObject(form), notify_email: form.get("notify_email") === "on", notify_whatsapp: form.get("notify_whatsapp") === "on" });
  if (!parsed.success) return zodErrorState(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({
    full_name: parsed.data.full_name,
    address_line: parsed.data.address_line ?? null,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
    notify_email: parsed.data.notify_email,
    notify_whatsapp: parsed.data.notify_whatsapp,
  }).eq("id", user.id);
  if (error) return { error: "Could not update profile." };
  revalidatePath("/dashboard/profile");
  return { ok: true, message: "Profile updated." };
}

export async function sendPhoneVerification(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({ phone: phoneSchema }).safeParse({ phone: form.get("phone") });
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`phone-otp:${user.id}`, 5, 3600))) return { error: "Too many codes requested. Try again later." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ phone: parsed.data.phone });
  if (error) return { error: error.message.includes("already") ? "That number is linked to another account." : "Could not send the code. Check the number and try again." };
  return { ok: true, message: `We sent a 6-digit code to ${parsed.data.phone}.`, data: { phone: parsed.data.phone } };
}

export async function confirmPhoneVerification(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = z.object({ phone: phoneSchema, token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") })
    .safeParse({ phone: form.get("phone"), token: form.get("token") });
  if (!parsed.success) return { ...zodErrorState(parsed.error), data: { phone: form.get("phone") } };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone: parsed.data.phone, token: parsed.data.token, type: "phone_change" });
  if (error) return { error: "Invalid or expired code.", data: { phone: parsed.data.phone } };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Phone number verified. You're all set!" };
}

export async function uploadKycDocument(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({
    doc_type: z.enum(["national_id", "passport", "drivers_license", "voters_card", "cac_certificate", "other"]),
    doc_number: z.string().trim().max(60).optional(),
    organisation_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  }).safeParse(formToObject(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const file = fileFrom(form, "document");
  if (!file) return { error: "Choose a file to upload.", fieldErrors: { document: ["Required"] } };
  if (!(await rateLimit(`upload:${user.id}`, LIMITS.upload.limit, LIMITS.upload.window))) return { error: "Too many uploads. Try again later." };
  if (parsed.data.organisation_id) {
    const { data: m } = await createAdminClient().from("organisation_members").select("role").eq("organisation_id", parsed.data.organisation_id)
      .eq("user_id", user.id).eq("status", "active").in("role", ["owner", "admin"]).maybeSingle();
    if (!m) return { error: "Only organisation owners/admins can upload organisation documents." };
  }
  try {
    const up = await uploadFile("kyc", user.id, file, 5 * 1024 * 1024);
    const db = createAdminClient();
    await db.from("kyc_documents").insert({
      user_id: user.id, organisation_id: parsed.data.organisation_id ?? null, doc_type: parsed.data.doc_type,
      doc_number: parsed.data.doc_number ?? null, storage_path: up.path,
    });
    if (parsed.data.organisation_id) await db.from("organisations").update({ kyc_status: "pending" }).eq("id", parsed.data.organisation_id).neq("kyc_status", "verified");
    else if (user.profile.kyc_status !== "verified") await db.from("users").update({ kyc_status: "pending" }).eq("id", user.id);
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "Upload failed." };
  }
  await notifyStaff("KYC document submitted", `${user.profile.full_name} (${user.email}) uploaded a ${parsed.data.doc_type.replace("_", " ")}.`, "/admin/customers?kyc=pending", ["operations", "super_admin"]);
  revalidatePath("/dashboard/profile");
  return { ok: true, message: "Document uploaded. We'll review it within one business day." };
}

// ---------------------------------------------------------------------------
// Organisations
// ---------------------------------------------------------------------------
async function requireOrgAdmin(userId: string, orgId: string) {
  const { data } = await createAdminClient().from("organisation_members").select("role")
    .eq("organisation_id", orgId).eq("user_id", userId).eq("status", "active").in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new RequestError("Only organisation owners and admins can do that.");
}

export async function createOrganisation(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = organisationSchema.safeParse(formToObject(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const db = createAdminClient();
  const { data: org, error } = await db.from("organisations").insert({ ...parsed.data, created_by: user.id }).select("id").single();
  if (error || !org) return { error: "Could not create organisation." };
  await db.from("organisation_members").insert({ organisation_id: org.id, user_id: user.id, role: "owner", status: "active" });
  await db.from("users").update({ account_type: "organisation" }).eq("id", user.id);
  revalidatePath("/dashboard/organisation");
  return { ok: true, message: "Organisation created." };
}

export async function inviteMember(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({
    organisation_id: z.string().uuid(),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    role: z.enum(["admin", "member"]),
  }).safeParse(formToObject(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  try { await requireOrgAdmin(user.id, parsed.data.organisation_id); } catch (e) { return { error: (e as Error).message }; }

  const db = createAdminClient();
  const { data: existing } = await db.from("users").select("id, email_verified").ilike("email", parsed.data.email).maybeSingle();
  const row: Record<string, unknown> = existing?.email_verified
    ? { organisation_id: parsed.data.organisation_id, user_id: existing.id, role: parsed.data.role, status: "active", invited_by: user.id }
    : { organisation_id: parsed.data.organisation_id, invited_email: parsed.data.email, role: parsed.data.role, status: "invited", invited_by: user.id };
  const { error } = await db.from("organisation_members").insert(row);
  if (error) return { error: error.code === "23505" ? "That person is already a member or invited." : "Could not add member." };

  const { sendEmail } = await import("@/lib/email");
  const { absoluteUrl } = await import("@/lib/site");
  await sendEmail({
    to: parsed.data.email,
    subject: "You've been added to an organisation on Web Purchase",
    heading: "You've been invited",
    paragraphs: [`${user.profile.full_name} added you to their organisation on Web Purchase.`, existing ? "Log in to see your organisation's requests." : "Create an account with this email address to join."],
    cta: { label: existing ? "Log in" : "Create account", url: absoluteUrl(existing ? "/login" : "/signup") },
  });
  revalidatePath("/dashboard/organisation");
  return { ok: true, message: existing?.email_verified ? "Member added." : "Invitation sent." };
}

export async function removeMember(form: FormData) {
  const user = await requireUser();
  const orgId = z.string().uuid().parse(form.get("organisation_id"));
  const memberId = z.string().uuid().parse(form.get("member_id"));
  await requireOrgAdmin(user.id, orgId);
  const db = createAdminClient();
  const { data: m } = await db.from("organisation_members").select("role, user_id").eq("id", memberId).eq("organisation_id", orgId).single();
  if (!m || m.role === "owner") throw new RequestError("The owner cannot be removed.");
  await db.from("organisation_members").delete().eq("id", memberId);
  revalidatePath("/dashboard/organisation");
}

/**
 * Bulk service requests for organisations. One line per request:
 *   Service name, https://website, amount, currency[, account email][, notes]
 */
export async function submitBulkRequests(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const unverified = assertVerified(user);
  if (unverified) return unverified;
  const orgId = z.string().uuid().safeParse(form.get("organisation_id"));
  if (!orgId.success) return { error: "Choose an organisation." };
  if (form.get("legal_confirmed") !== "on") return { error: "You must confirm all requests are legal and comply with our Terms of Service.", fieldErrors: { legal_confirmed: ["Required"] } };

  const lines = String(form.get("lines") ?? "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { error: "Add at least one line." };
  if (lines.length > 50) return { error: "Maximum 50 requests per batch." };

  const rows = [];
  const errors: string[] = [];
  for (const [i, line] of lines.entries()) {
    const [service_name, website_url, amount, currency, account_email, ...notes] = line.split(",").map((s) => s.trim());
    const parsed = serviceRequestSchema.safeParse({
      type: "service", service_name, website_url, amount, currency: (currency ?? "").toUpperCase(),
      account_email: account_email ?? "", notes: notes.join(", "), legal_confirmed: "on", organisation_id: orgId.data,
    });
    if (!parsed.success) errors.push(`Line ${i + 1}: ${parsed.error.issues[0].message}`);
    else rows.push(parsed.data);
  }
  if (errors.length) return { error: `Fix these lines and try again:\n${errors.slice(0, 10).join("\n")}` };
  if (!(await rateLimit(`bulk:${user.id}`, 5, 3600))) return { error: "Too many bulk submissions. Try again later." };

  const batchId = randomUUID();
  let created = 0;
  const failures: string[] = [];
  for (const d of rows) {
    try {
      await createRequest(user, {
        type: "service", title: d.service_name, organisationId: orgId.data, batchId, source: "bulk",
        serviceName: d.service_name, websiteUrl: d.website_url, accountEmail: d.account_email, amount: d.amount,
        currency: d.currency, notes: d.notes, legalConfirmed: true,
      });
      created++;
    } catch (e) {
      failures.push(`${d.service_name}: ${(e as Error).message}`);
    }
  }
  revalidatePath("/dashboard/requests");
  return failures.length
    ? { ok: created > 0, error: `${created} created. ${failures.length} not accepted:\n${failures.join("\n")}` }
    : { ok: true, message: `${created} requests submitted as one batch. We'll send quotes shortly.` };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}

