import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRequestEvent } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Mark overdue quotes as expired and tell the client a new quote is needed. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const db = createAdminClient();
  const { data: expired, error } = await db
    .from("quotes")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .select("id, request_id");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  for (const q of expired ?? []) {
    await db.from("request_events").insert({ request_id: q.request_id, title: "Quote expired", note: "Ask us to re-issue the quote at the current rate." });
    await notifyRequestEvent(q.request_id, "quote_expired");
  }
  return NextResponse.json({ ok: true, expired: expired?.length ?? 0 });
}
