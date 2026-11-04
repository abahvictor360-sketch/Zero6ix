"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { fileFrom, uploadFile, validateFile, UploadError } from "@/lib/storage";
import { notifyStaff } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/site";
import { contactSchema, formToObject, zodErrorState, type ActionState } from "@/lib/validation";

const ENQUIRY = { service: "Pay for a service", item: "Buy an item", business: "Business / bulk payments", other: "General enquiry" } as const;
const SENT = "Thank you! Your message has been sent. We'll reply within one business day.";

// Per-instance fallback limiter for when the database isn't connected yet.
const memoryHits = new Map<string, number[]>();
function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  memoryHits.set(key, hits);
  return hits.length <= limit;
}

/**
 * Contact form. Stores the message when the database is connected; always
 * emails it to the team when an email provider (Resend) is configured. If
 * neither is available, the client falls back to opening the visitor's email app.
 */
export async function submitContact(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    // Honeypot filled → pretend success to the bot.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: SENT };
    return zodErrorState(parsed.error);
  }
  const d = parsed.data;
  const ip = await clientIp();
  const dbReady = isServiceRoleConfigured();
  const emailReady = Boolean(process.env.RESEND_API_KEY);

  if (!(await rateLimit(`contact:${ip}`, LIMITS.contact.limit, LIMITS.contact.window)) || !memoryLimit(ip, LIMITS.contact.limit, LIMITS.contact.window * 1000)) {
    return { error: `You've sent several messages recently. Please try again later or email ${site.email}.` };
  }

  const file = fileFrom(form, "attachment");
  let attachment: { filename: string; content: Buffer } | undefined;
  let attachmentPath: string | null = null;
  if (file) {
    try {
      if (dbReady) {
        attachmentPath = (await uploadFile("contact", new Date().toISOString().slice(0, 10), file, 5 * 1024 * 1024)).path;
      }
      const v = await validateFile(file, 5 * 1024 * 1024);
      attachment = { filename: v.name, content: Buffer.from(v.bytes) };
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "Attachment upload failed.", fieldErrors: { attachment: ["Invalid file"] } };
    }
  }

  if (!dbReady && !emailReady) {
    // Nothing server-side can deliver the message yet, so let the browser open an email draft.
    return { ok: false, data: { fallback: "mailto" } };
  }

  let id: string | null = null;
  if (dbReady) {
    const { data, error } = await createAdminClient()
      .from("contact_submissions")
      .insert({
        name: d.name, email: d.email, phone: d.phone ?? null,
        subject: `[${ENQUIRY[d.enquiry]}] ${d.subject}`,
        message: d.country ? `Country: ${d.country}\n\n${d.message}` : d.message,
        attachment_path: attachmentPath, ip_address: ip,
      })
      .select("id")
      .single();
    if (error && !emailReady) return { error: `Something went wrong. Please try again or email ${site.email}.` };
    id = data?.id ?? null;
  }

  const delivered = await sendEmail({
    to: process.env.CONTACT_FORM_TO ?? site.email,
    replyTo: d.email,
    subject: `Website enquiry: ${d.subject}`,
    heading: `New enquiry: ${ENQUIRY[d.enquiry]}`,
    paragraphs: [
      `From: ${d.name} <${d.email}>${d.phone ? ` · ${d.phone}` : ""}${d.country ? ` · ${d.country}` : ""}`,
      `Subject: ${d.subject}`,
      d.message,
      "Reply to this email to respond directly to the customer.",
    ],
    attachments: attachment ? [attachment] : undefined,
  });
  if (!delivered && !id) return { error: `We couldn't send your message right now. Please email ${site.email} or call ${site.phone}.` };

  await Promise.allSettled([
    id ? notifyStaff(`New contact message: ${d.subject}`, `${d.name} (${d.email}) wrote: ${d.message.slice(0, 200)}`, `/admin/contacts#${id}`, ["support", "super_admin"]) : Promise.resolve(),
    sendEmail({
      to: d.email,
      subject: "We received your message",
      heading: `Thanks, ${d.name.split(" ")[0]}!`,
      paragraphs: ["We've received your message and a member of our team will respond within one business day.", `Subject: ${d.subject}`],
    }),
  ]);
  return { ok: true, message: SENT };
}
