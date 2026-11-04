import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH = "https://graph.facebook.com/v21.0";

export const isWhatsAppConfigured = () =>
  Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/** WhatsApp IDs are E.164 digits without '+'. */
export const toWaId = (phone: string) => phone.replace(/\D/g, "");

async function post(payload: Record<string, unknown>) {
  if (!isWhatsAppConfigured()) {
    console.info("[whatsapp] not configured: skipping message", JSON.stringify(payload).slice(0, 200));
    return null;
  }
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
  if (!res.ok) {
    console.error("[whatsapp] send failed", res.status, json.error?.message);
    return null;
  }
  return json.messages?.[0]?.id ?? null;
}

async function log(waId: string, body: string, messageId: string | null, sentBy: string | null) {
  const db = createAdminClient();
  const { data: conv } = await db
    .from("whatsapp_conversations")
    .upsert({ wa_id: waId, last_message_at: new Date().toISOString() }, { onConflict: "wa_id" })
    .select("id")
    .single();
  if (conv) {
    await db.from("whatsapp_messages").insert({
      conversation_id: conv.id,
      direction: "outbound",
      body,
      wa_message_id: messageId,
      sent_by: sentBy,
    });
  }
}

/** Free-form text: only deliverable inside the 24h customer-service window. */
export async function sendWhatsAppText(to: string, body: string, opts: { sentBy?: string | null; log?: boolean } = {}) {
  const waId = toWaId(to);
  const id = await post({ to: waId, type: "text", text: { preview_url: true, body: body.slice(0, 4096) } });
  if (opts.log !== false) await log(waId, body, id, opts.sentBy ?? null).catch(() => undefined);
  return id;
}

/**
 * Business-initiated notification. Uses the approved template configured in
 * WHATSAPP_STATUS_TEMPLATE (body params: {{1}} name, {{2}} message) when set,
 * which is required outside the 24h window; otherwise falls back to text.
 */
export async function sendWhatsAppNotification(to: string, name: string, message: string) {
  const template = process.env.WHATSAPP_STATUS_TEMPLATE;
  if (!template) return sendWhatsAppText(to, message);
  const waId = toWaId(to);
  const id = await post({
    to: waId,
    type: "template",
    template: {
      name: template,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: name || "there" }, { type: "text", text: message.slice(0, 1000) }] },
      ],
    },
  });
  await log(waId, `[template:${template}] ${message}`, id, null).catch(() => undefined);
  return id;
}
