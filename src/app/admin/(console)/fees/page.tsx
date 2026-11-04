import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { FeesForm, ShippingRateForm } from "@/components/admin/forms";
import { DEFAULT_FEES } from "@/lib/settings";
import type { FeeSettings, ShippingRate } from "@/lib/types";

export const metadata = { title: "Fees & shipping" };

export default async function FeesPage() {
  await requireStaff("fees.manage");
  const db = createAdminClient();
  const [{ data: fees }, { data: shipping }] = await Promise.all([
    db.from("fee_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("shipping_rates").select("*").order("sort_order"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Fees & shipping" description="Changes apply to new quotes only. Existing quotes keep their locked price." />
      <section className="card">
        <h2 className="mb-4 font-semibold">Service fees & policies</h2>
        <FeesForm fees={(fees ?? DEFAULT_FEES) as FeeSettings} />
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Shipping rates by origin</h2>
        <p className="muted text-sm">USD per kg (billed per started 0.5kg) with a minimum charge, converted at the USD sell rate.</p>
        <div className="hidden gap-2 px-1 text-xs font-semibold uppercase text-slate-500 sm:grid sm:grid-cols-[70px_1.5fr_1fr_1fr_80px_80px_auto_auto]">
          <span>Code</span><span>Label</span><span>$/kg</span><span>Min $</span><span>Min d</span><span>Max d</span><span /><span />
        </div>
        {((shipping ?? []) as ShippingRate[]).map((s) => <ShippingRateForm key={s.origin_region} rate={s} />)}
        <div className="border-t border-slate-100 pt-3 dark:border-white/10">
          <p className="mb-2 text-sm font-medium">Add origin</p>
          <ShippingRateForm />
        </div>
      </section>
    </div>
  );
}
