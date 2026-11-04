import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppNotification } from "@/lib/whatsapp/client";
import { absoluteUrl } from "@/lib/site";
import { formatDate, formatMoney } from "@/lib/format";
import type { Quote, RequestRow, UserProfile } from "@/lib/types";

export type NotificationEvent =
  | "request_received"
  | "quote_ready"
  | "payment_confirmed"
  | "processing"
  | "order_completed"
  | "item_shipped"
  | "item_delivered"
  | "request_rejected"
  | "refunded"
  | "new_message"
  | "quote_expired";

interface Extra {
  quote?: Quote;
  reason?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  message?: string;
  attachments?: { filename: string; content: Buffer }[];
}

function compose(event: NotificationEvent, r: RequestRow, x: Extra) {
  const ref = r.reference;
  const link = r.user_id ? `/dashboard/requests/${r.id}` : `/track?ref=${ref}`;
  switch (event) {
    case "request_received":
      return { title: `Request ${ref} received`, body: `We've received your request "${r.title}". Our team will review it and send a quote shortly.`, link };
    case "quote_ready":
      return {
        title: `Your quote for ${ref} is ready`,
        body: `Total: ${formatMoney(x.quote?.total_ngn)}. This quote locks the exchange rate until ${formatDate(x.quote?.expires_at, true)}.`,
        link: x.quote ? `/pay/${x.quote.payment_token}` : link,
        cta: "View quote & pay",
      };
    case "quote_expired":
      return { title: `Quote for ${ref} expired`, body: `The quote for "${r.title}" has expired. Reply or contact us and we'll re-issue it at the current rate.`, link };
    case "payment_confirmed":
      return { title: `Payment confirmed for ${ref}`, body: `Thank you! We've received your payment and will start processing "${r.title}" right away. Your invoice and receipt are attached and available in your dashboard.`, link };
    case "processing":
      return { title: `${ref} is being processed`, body: `We're now paying the vendor for "${r.title}".`, link };
    case "order_completed":
      return { title: `${ref} completed`, body: `"${r.title}" is complete. Proof, receipts and access details are in your dashboard.`, link };
    case "item_shipped":
      return { title: `${ref} has shipped`, body: `Your item is on its way${x.carrier ? ` via ${x.carrier}` : ""}${x.trackingNumber ? ` (tracking: ${x.trackingNumber})` : ""}.`, link };
    case "item_delivered":
      return { title: `${ref} delivered`, body: `Your order "${r.title}" has been delivered. Thanks for using Web Purchase!`, link };
    case "request_rejected":
      return { title: `${ref} could not be accepted`, body: `We couldn't accept "${r.title}". Reason: ${x.reason ?? "not specified"}.`, link };
    case "refunded":
      return { title: `${ref} refunded`, body: `A refund has been issued for "${r.title}". It may take 3–10 working days to reflect.`, link };
    case "new_message":
      return { title: `New message on ${ref}`, body: x.message ? x.message.slice(0, 280) : "You have a new message from our team.", link };
  }
}

/** Notify the client (in-app + email + WhatsApp) about a request event. Never throws. */
export async function notifyRequestEvent(requestId: string, event: NotificationEvent, extra: Extra = {}) {
  try {
    const db = createAdminClient();
    const { data: request } = await db.from("requests").select("*").eq("id", requestId).single<RequestRow>();
    if (!request) return;
    const msg = compose(event, request, extra);

    let user: UserProfile | null = null;
    if (request.user_id) {
      const { data } = await db.from("users").select("*").eq("id", request.user_id).single<UserProfile>();
      user = data;
    }

    const jobs: Promise<unknown>[] = [];
    if (user) {
      jobs.push(Promise.resolve(db.from("notifications").insert({ user_id: user.id, title: msg.title, body: msg.body, link: msg.link, event })));
    }
    const email = user?.email ?? request.contact_email;
    if (email && (user?.notify_email ?? true)) {
      jobs.push(
        sendEmail({
          to: email,
          subject: msg.title,
          heading: msg.title,
          paragraphs: [`Hi ${user?.full_name?.split(" ")[0] || "there"},`, msg.body],
          cta: { label: ("cta" in msg && msg.cta) || "View request", url: absoluteUrl(msg.link) },
          attachments: extra.attachments,
        }),
      );
    }
    const phone = user?.phone ?? request.contact_phone;
    if (phone && (user?.notify_whatsapp ?? true)) {
      jobs.push(sendWhatsAppNotification(phone, user?.full_name?.split(" ")[0] ?? "", `${msg.title}\n\n${msg.body}\n\n${absoluteUrl(msg.link)}`));
    }
    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[notify] failed", event, requestId, err);
  }
}

/** In-app notification for all staff (optionally limited to roles) + ops email. */
export async function notifyStaff(title: string, body: string, link: string, roles: string[] = ["support", "operations", "super_admin"]) {
  try {
    const db = createAdminClient();
    const { data: staff } = await db.from("users").select("id").in("role", roles);
    if (staff?.length) {
      await db.from("notifications").insert(staff.map((s) => ({ user_id: s.id, title, body, link, event: "staff" })));
    }
    if (process.env.OPS_NOTIFICATION_EMAIL) {
      await sendEmail({
        to: process.env.OPS_NOTIFICATION_EMAIL.split(",").map((s) => s.trim()),
        subject: `[Ops] ${title}`,
        heading: title,
        paragraphs: [body],
        cta: { label: "Open in admin", url: absoluteUrl(link) },
      });
    }
  } catch (err) {
    console.error("[notify] staff notification failed", err);
  }
}
