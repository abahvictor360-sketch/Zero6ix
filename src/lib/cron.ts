import "server-only";
import { safeEqual } from "@/lib/crypto";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  return Boolean(secret) && safeEqual(header, `Bearer ${secret}`);
}
