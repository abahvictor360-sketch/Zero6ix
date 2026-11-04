import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/env";

/**
 * Fixed-window rate limit backed by Postgres (works across serverless instances).
 * Returns true when the action is allowed. Fails open if the DB is unreachable,
 * so a database blip never blocks legitimate users entirely.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!isServiceRoleConfigured()) return true;
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}

export const LIMITS = {
  contact: { limit: 5, window: 3600 },
  track: { limit: 20, window: 600 },
  createRequest: { limit: 20, window: 3600 },
  message: { limit: 60, window: 3600 },
  payment: { limit: 10, window: 600 },
  upload: { limit: 30, window: 3600 },
  whatsapp: { limit: 40, window: 600 },
} as const;
