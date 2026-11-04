"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { fileFrom, uploadFile, UploadError } from "@/lib/storage";
import { notifyStaff } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { contactSchema, formToObject, zodErrorState, type ActionState } from "@/lib/validation";

export async function submitContact(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    // Honeypot filled → pretend success to the bot.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: "Thanks! We'll be in touch." };
    return zodErrorState(parsed.error);
  }
  if (!isServiceRoleConfigured()) return { error: "The contact form is not configured yet. Please email or WhatsApp us." };

  const ip = await clientIp();
  if (!(await rateLimit(`contact:${ip}`, LIMITS.contact.limit, LIMITS.contact.window))) {
    return { error: "You've sent several messages recently. Please try again later or reach us on WhatsApp." };
  }

  let attachmentPath: string | null = null;
  const file = fileFrom(form, "attachment");
  if (file) {
    try {
      attachmentPath = (await uploadFile("contact", new Date().toISOString().slice(0, 10), file, 5 * 1024 * 1024)).path;
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "Attachment upload failed.", fieldErrors: { attachment: ["Invalid file"] } };
    }
  }

  const d = parsed.data;
  const { data, error } = await createAdminClient()
    .from("contact_submissions")
    .insert({ name: d.name, email: d.email, phone: d.phone ?? null, subject: d.subject, message: d.message, attachment_path: attachmentPath, ip_address: ip })
    .select("id")
    .single();
  if (error) return { error: "Something went wrong. Please try again." };

  await Promise.allSettled([
    notifyStaff(`New contact message: ${d.subject}`, `${d.name} (${d.email}) wrote: ${d.message.slice(0, 200)}`, `/admin/contacts#${data.id}`, ["support", "super_admin"]),
    sendEmail({
      to: d.email,
      subject: "We received your message",
      heading: `Thanks, ${d.name.split(" ")[0]}!`,
      paragraphs: ["We've received your message and a member of our team will respond within one business day.", `Subject: ${d.subject}`],
    }),
  ]);
  return { ok: true, message: "Thanks! Your message has been sent. We'll reply within one business day." };
}
