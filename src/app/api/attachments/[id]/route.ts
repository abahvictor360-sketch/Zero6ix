import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";

/**
 * Serves a private attachment. Access is decided by RLS on `attachments`
 * (owner / org member / staff, and visible_to_client for clients); only then
 * do we mint a short-lived signed URL.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: file } = await supabase.from("attachments").select("storage_path").eq("id", id).maybeSingle();
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await signedUrl("attachments", file.storage_path, 120);
  if (!url) return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
