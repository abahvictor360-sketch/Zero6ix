import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { syncRatesFromApi } from "@/lib/rates";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    const result = await syncRatesFromApi();
    await audit(null, "rate.sync.cron", "exchange_rate", null, result);
    await createAdminClient().rpc("purge_rate_limits");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron:rates]", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
