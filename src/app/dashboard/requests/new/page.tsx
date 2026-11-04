import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getShippingRates } from "@/lib/settings";
import { Alert, PageHeader } from "@/components/ui";
import { NewRequestForm } from "./request-form";

export const metadata = { title: "New request" };

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser("/dashboard/requests/new");
  const { type } = await searchParams;
  const supabase = await createClient();
  const [{ data: memberships }, shipping] = await Promise.all([
    supabase.from("organisation_members").select("organisation_id, organisations(name)").eq("user_id", user.id).eq("status", "active"),
    getShippingRates(),
  ]);
  const orgs = (memberships ?? []).map((m) => ({
    id: m.organisation_id as string,
    name: ((m.organisations as unknown as { name: string } | null)?.name) ?? "Organisation",
  }));
  const needsPhone = process.env.REQUIRE_PHONE_VERIFICATION !== "false" && !user.profile.phone_verified;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New request" description="Tell us what you need. We'll review it and send a Naira quote — usually within an hour during business hours." />
      {needsPhone && (
        <Alert tone="warning" className="mb-6">
          You need to <Link href="/dashboard/verify" className="font-semibold underline">verify your phone number</Link> before submitting a request.
        </Alert>
      )}
      <NewRequestForm
        initialType={type === "item" ? "item" : "service"}
        orgs={orgs}
        shippingOrigins={shipping.map((s) => ({ value: s.origin_region, label: s.label.split(" →")[0] }))}
        defaults={{ email: user.email ?? "", address: user.profile.address_line ?? "", city: user.profile.city ?? "", state: user.profile.state ?? "", phone: user.profile.phone ?? "" }}
      />
      {orgs.length > 0 && (
        <p className="muted mt-6 text-center text-sm">Paying for many tools at once? Use <Link href="/dashboard/organisation#bulk" className="font-semibold underline">bulk requests</Link>.</p>
      )}
    </div>
  );
}
