import { after, NextResponse, type NextRequest } from "next/server";
import { hmacHex, safeEqual } from "@/lib/crypto";
import { parseWebhook, processInbound } from "@/lib/whatsapp/handler";
import { envValue } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta webhook verification handshake. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const token = envValue("WHATSAPP_VERIFY_TOKEN");
  if (p.get("hub.mode") === "subscribe" && token && p.get("hub.verify_token") === token) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Inbound messages. Verifies X-Hub-Signature-256 (HMAC-SHA256 of the raw body
 * with the app secret), acknowledges immediately, then processes after the
 * response so Meta never times out and retries.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = envValue("WHATSAPP_APP_SECRET");
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!secret || !safeEqual(signature, `sha256=${hmacHex("sha256", secret, raw)}`)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  const messages = parseWebhook(body);
  after(async () => {
    for (const m of messages) {
      try {
        await processInbound(m);
      } catch (e) {
        console.error("[whatsapp] failed to process message", m.messageId, e);
      }
    }
  });
  return NextResponse.json({ received: true });
}
