import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessRequestText, type Keyword } from "@/lib/compliance";
import { notifyRequestEvent, notifyStaff } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { getFeeSettings, getPublicRates } from "@/lib/settings";
import type { CurrentUser } from "@/lib/auth";
import type { RequestRow } from "@/lib/types";

export class RequestError extends Error {}

export interface NewRequestInput {
  type: "service" | "item";
  title: string;
  organisationId?: string;
  batchId?: string;
  source?: RequestRow["source"];
  status?: "submitted" | "draft";
  serviceName?: string;
  websiteUrl?: string;
  accountEmail?: string;
  amount?: number;
  currency: string;
  deadline?: string;
  notes?: string;
  deliveryAddress?: RequestRow["delivery_address"];
  originRegion?: string;
  contactPhone?: string;
  contactEmail?: string;
  legalConfirmed: boolean;
  items?: { product_url: string; name?: string; quantity: number; variant?: string; estimated_price?: number }[];
}

export async function getKeywords(): Promise<Keyword[]> {
  const { data } = await createAdminClient().from("prohibited_keywords").select("keyword, severity, category");
  return (data ?? []) as Keyword[];
}

/** Verify the user may submit on behalf of an organisation. */
export async function assertOrgMember(userId: string, organisationId: string) {
  const { data } = await createAdminClient()
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) throw new RequestError("You are not a member of that organisation.");
}

/**
 * Create a request with compliance screening. Blocked keywords are rejected
 * up-front; flag-level matches are stored (by DB trigger) for admin review.
 */
export async function createRequest(user: CurrentUser | null, input: NewRequestInput): Promise<RequestRow> {
  if (!input.legalConfirmed && input.status !== "draft") throw new RequestError("You must confirm the request is legal.");
  if (user && input.organisationId) await assertOrgMember(user.id, input.organisationId);

  const text = [input.title, input.serviceName, input.websiteUrl, input.notes, ...(input.items ?? []).flatMap((i) => [i.product_url, i.name, i.variant])]
    .filter(Boolean)
    .join(" ");
  const { blocked } = assessRequestText(text, await getKeywords());
  if (blocked.length) {
    await audit(user, "request.blocked", "request", null, { keywords: blocked.map((b) => b.keyword), title: input.title });
    throw new RequestError(
      `This request appears to involve prohibited items or services (${blocked.map((b) => b.keyword).join(", ")}). See our Prohibited Items page. If you believe this is a mistake, contact support.`,
    );
  }

  // KYC: flag orders whose estimated value meets the ID-verification threshold.
  const [fees, rates] = await Promise.all([getFeeSettings(), getPublicRates()]);
  const rate = rates.find((r) => r.currency === input.currency)?.sell_rate ?? 0;
  const estimate = (input.amount ?? 0) * rate;
  const requiresKyc = estimate >= fees.kyc_threshold_ngn && user?.profile.kyc_status !== "verified";

  const db = createAdminClient();
  const { data: request, error } = await db
    .from("requests")
    .insert({
      user_id: user?.id ?? null,
      organisation_id: input.organisationId ?? null,
      batch_id: input.batchId ?? null,
      type: input.type,
      status: input.status ?? "submitted",
      source: input.source ?? "web",
      title: input.title.slice(0, 200),
      service_name: input.serviceName ?? null,
      website_url: input.websiteUrl ?? null,
      account_email: input.accountEmail ?? null,
      amount: input.amount ?? null,
      currency: input.currency,
      deadline: input.deadline ?? null,
      notes: input.notes ?? null,
      delivery_address: input.deliveryAddress ?? null,
      origin_region: input.originRegion ?? null,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      legal_confirmed: input.legalConfirmed,
      legal_confirmed_at: input.legalConfirmed ? new Date().toISOString() : null,
      requires_kyc: requiresKyc,
    })
    .select("*")
    .single<RequestRow>();
  if (error || !request) {
    console.error("[requests] insert failed", error);
    throw new RequestError("We couldn't save your request. Please try again.");
  }

  if (input.items?.length) {
    const { error: itemsError } = await db.from("request_items").insert(
      input.items.map((i) => ({
        request_id: request.id,
        product_url: i.product_url,
        name: i.name ?? null,
        quantity: i.quantity,
        variant: i.variant ?? null,
        estimated_price: i.estimated_price ?? null,
        currency: input.currency,
      })),
    );
    if (itemsError) console.error("[requests] items insert failed", itemsError);
  }

  await db.from("request_events").insert({
    request_id: request.id,
    status: request.status,
    title: request.status === "draft" ? "Draft created via WhatsApp" : "Request submitted",
    actor_id: user?.id ?? null,
  });

  if (request.status !== "draft") {
    await notifyRequestEvent(request.id, "request_received");
  }
  // Re-read to pick up trigger-computed flags.
  const { data: fresh } = await db.from("requests").select("flagged, flag_reasons").eq("id", request.id).single();
  await notifyStaff(
    `${fresh?.flagged ? "⚠️ Flagged " : "New "}${request.status === "draft" ? "draft" : "request"} ${request.reference}`,
    `${request.title}${fresh?.flagged ? `: ${fresh.flag_reasons.join(", ")}` : ""}`,
    `/admin/requests/${request.id}`,
  );
  return { ...request, flagged: fresh?.flagged ?? request.flagged, flag_reasons: fresh?.flag_reasons ?? request.flag_reasons };
}
