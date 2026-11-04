"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { normalizePhone } from "@/lib/format";
import { trackSchema, zodErrorState, type ActionState } from "@/lib/validation";
import type { RequestEvent, RequestRow, Shipment, UserProfile } from "@/lib/types";

export interface TrackResult {
  reference: string;
  title: string;
  type: RequestRow["type"];
  status: RequestRow["status"];
  created_at: string;
  events: Pick<RequestEvent, "title" | "note" | "status" | "created_at">[];
  shipment: Pick<Shipment, "carrier" | "tracking_number" | "tracking_url" | "status" | "estimated_delivery"> | null;
}

export type TrackState = ActionState & { result?: TrackResult };

const NOT_FOUND = "We couldn't find an order with those details. Check the order ID and use the email or phone number on the order.";

export async function trackOrder(_: TrackState, form: FormData): Promise<TrackState> {
  const parsed = trackSchema.safeParse({ reference: form.get("reference"), contact: form.get("contact") });
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!isServiceRoleConfigured()) return { error: "Order tracking is not available yet." };

  if (!(await rateLimit(`track:${await clientIp()}`, LIMITS.track.limit, LIMITS.track.window))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const db = createAdminClient();
  const { data: request } = await db.from("requests").select("*").eq("reference", parsed.data.reference).maybeSingle<RequestRow>();
  if (!request || request.status === "draft") return { error: NOT_FOUND };

  let user: Pick<UserProfile, "email" | "phone"> | null = null;
  if (request.user_id) {
    const { data } = await db.from("users").select("email, phone").eq("id", request.user_id).maybeSingle();
    user = data;
  }

  const contact = parsed.data.contact.toLowerCase();
  const phone = normalizePhone(contact);
  const emails = [user?.email, request.contact_email].filter(Boolean).map((e) => e!.toLowerCase());
  const phones = [user?.phone, request.contact_phone, request.delivery_address?.phone].filter(Boolean).map((p) => normalizePhone(p!));
  const matches = emails.includes(contact) || (phone !== null && phones.includes(phone));
  if (!matches) return { error: NOT_FOUND };

  const [{ data: events }, { data: shipment }] = await Promise.all([
    db.from("request_events").select("title, note, status, created_at").eq("request_id", request.id).eq("visible_to_client", true).order("created_at"),
    db.from("shipments").select("carrier, tracking_number, tracking_url, status, estimated_delivery").eq("request_id", request.id).maybeSingle(),
  ]);

  return {
    ok: true,
    result: {
      reference: request.reference,
      title: request.title,
      type: request.type,
      status: request.status,
      created_at: request.created_at,
      events: events ?? [],
      shipment: shipment ?? null,
    },
  };
}
