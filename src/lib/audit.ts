import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/** Record an admin/system action. Never throws (auditing must not break flows). */
export async function audit(
  actor: CurrentUser | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    await createAdminClient().from("audit_logs").insert({
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? (actor ? null : "system"),
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: await clientIp().catch(() => null),
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
