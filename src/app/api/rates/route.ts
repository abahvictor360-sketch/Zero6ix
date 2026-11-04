import { NextResponse } from "next/server";
import { getPublicRates } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Public sell rates (NGN per unit). Buy rates are never exposed. */
export async function GET() {
  const rates = await getPublicRates();
  return NextResponse.json(
    { base: "NGN", rates },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
