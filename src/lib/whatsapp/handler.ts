import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleMessage, type BotState, type BotStateName, type OrderSummary } from "./bot";
import { sendWhatsAppText } from "./client";
import { getFeeSettings, getPublicRates } from "@/lib/settings";
import { describeBusinessHours, isWithinBusinessHours } from "@/lib/business-hours";
import { createRequest } from "@/lib/requests";
import { notifyStaff } from "@/lib/notifications";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/format";
import { site } from "@/lib/site";
import type { CurrentUser } from "@/lib/auth";
import type { RequestRow, UserProfile } from "@/lib/types";

export interface InboundMessage {
  waId: string;          // digits, e.g. 2348031234567
  messageId: string;
  profileName: string;
  text: string | null;   // null for media / unsupported types
  kind: string;
}

/** Process one inbound WhatsApp message end-to-end (log → bot → reply → persist). */
export async function processInbound(msg: InboundMessage) {
  const db = createAdminClient();
  const phone = normalizePhone(msg.waId) ?? `+${msg.waId}`;

  // Link to a registered user with this (verified) phone number, if any.
  const { data: user } = await db.from("users").select("*").eq("phone", phone).eq("phone_verified", true).maybeSingle<UserProfile>();

  const { data: conv } = await db
    .from("whatsapp_conversations")
    .upsert(
      { wa_id: msg.waId, profile_name: msg.profileName || null, user_id: user?.id ?? null, last_inbound_at: new Date().toISOString(), last_message_at: new Date().toISOString() },
      { onConflict: "wa_id" },
    )
    .select("*")
    .single();
  if (!conv) return;

  // Idempotency: Meta retries webhooks: the unique wa_message_id drops duplicates.
  const { error: dupError } = await db.from("whatsapp_messages").insert({
    conversation_id: conv.id, direction: "inbound", body: msg.text ?? `[${msg.kind}]`, wa_message_id: msg.messageId,
  });
  if (dupError?.code === "23505") return;

  if (!(await rateLimit(`wa:${msg.waId}`, LIMITS.whatsapp.limit, LIMITS.whatsapp.window))) return;

  if (conv.handoff) {
    if (!/^(menu|bot)$/i.test(msg.text?.trim() ?? "")) {
      await notifyStaff(`WhatsApp: new message from +${msg.waId}`, (msg.text ?? `[${msg.kind}]`).slice(0, 200), `/admin/whatsapp?c=${conv.id}`, ["support", "operations", "super_admin"]);
      return;
    }
  }

  if (!msg.text) {
    await sendWhatsAppText(msg.waId, "I can only read text messages for now 🙂 Type *menu* to see options, or *5* to talk to a human who can view attachments.");
    return;
  }

  const [rates, fees] = await Promise.all([getPublicRates(), getFeeSettings()]);
  const currentUser: CurrentUser | null = user ? { id: user.id, email: user.email, profile: user } : null;

  const result = await handleMessage({ state: conv.state as BotStateName, data: conv.state_data ?? {} } as BotState, msg.text, {
    profileName: (user?.full_name || msg.profileName || "").split(" ")[0],
    siteUrl: site.url,
    rates,
    fees,
    isBusinessHours: isWithinBusinessHours(fees.business_hours),
    hoursText: describeBusinessHours(fees.business_hours),
    lookupOrder: async (reference): Promise<OrderSummary | null> => {
      const { data: r } = await db.from("requests").select("*").eq("reference", reference).maybeSingle<RequestRow>();
      if (!r || r.status === "draft") return null;
      let ownerPhone: string | null = null;
      if (r.user_id) ownerPhone = (await db.from("users").select("phone").eq("id", r.user_id).maybeSingle()).data?.phone ?? null;
      const phones = [ownerPhone, r.contact_phone, r.delivery_address?.phone].map((p) => normalizePhone(p));
      if (!phones.includes(phone)) return null; // only reveal orders tied to this number
      const { data: s } = await db.from("shipments").select("carrier, tracking_number").eq("request_id", r.id).maybeSingle();
      return { reference: r.reference, title: r.title, status: r.status, updated_at: r.updated_at, tracking: s?.tracking_number ? `${s.carrier ?? ""} ${s.tracking_number}`.trim() : null };
    },
    createDraft: async (d) => {
      const r = await createRequest(currentUser, {
        type: d.type,
        title: d.name,
        status: "draft",
        source: "whatsapp",
        serviceName: d.type === "service" ? d.name : undefined,
        websiteUrl: d.type === "service" ? d.url : undefined,
        items: d.type === "item" && d.url ? [{ product_url: d.url, name: d.name, quantity: 1 }] : undefined,
        amount: d.amount,
        currency: d.currency,
        notes: d.notes,
        contactPhone: phone,
        contactEmail: user?.email ?? undefined,
        legalConfirmed: true, // user replied YES to the legal confirmation prompt
      });
      return { reference: r.reference };
    },
    requestHandoff: async () => {
      await db.from("whatsapp_conversations").update({ handoff: true, handoff_requested_at: new Date().toISOString() }).eq("id", conv.id);
      await notifyStaff(`WhatsApp hand-off: +${msg.waId}`, `${msg.profileName || "A customer"} wants to talk to a human.`, `/admin/whatsapp?c=${conv.id}`, ["support", "operations", "super_admin"]);
    },
  });

  for (const reply of result.replies) await sendWhatsAppText(msg.waId, reply);
  await db.from("whatsapp_conversations").update({
    state: result.next.state,
    state_data: result.next.data,
    handoff: result.next.state === "human",
    last_message_at: new Date().toISOString(),
  }).eq("id", conv.id);
}

/** Extract text messages from a Meta Cloud API webhook payload. */
export function parseWebhook(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { value?: Record<string, unknown> }[] }[]) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const contacts = (value.contacts as { wa_id: string; profile?: { name?: string } }[] | undefined) ?? [];
      for (const m of (value.messages as Record<string, unknown>[] | undefined) ?? []) {
        const from = String(m.from ?? "");
        if (!/^\d{8,15}$/.test(from)) continue;
        const type = String(m.type ?? "unknown");
        let text: string | null = null;
        if (type === "text") text = String((m.text as { body?: string })?.body ?? "");
        else if (type === "button") text = String((m.button as { text?: string })?.text ?? "");
        else if (type === "interactive") {
          const i = m.interactive as { button_reply?: { title?: string; id?: string }; list_reply?: { title?: string; id?: string } };
          text = i?.button_reply?.id ?? i?.list_reply?.id ?? i?.button_reply?.title ?? i?.list_reply?.title ?? null;
        }
        out.push({
          waId: from,
          messageId: String(m.id ?? ""),
          profileName: contacts.find((c) => c.wa_id === from)?.profile?.name ?? "",
          text: text ? text.slice(0, 2000) : null,
          kind: type,
        });
      }
    }
  }
  return out;
}
