import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { RateRowForm, SyncRatesButton } from "@/components/admin/forms";
import { formatDate } from "@/lib/format";
import type { ExchangeRate } from "@/lib/types";

export const metadata = { title: "Exchange rates" };

export default async function RatesPage() {
  await requireStaff("rates.manage");
  const { data } = await createAdminClient().from("exchange_rates").select("*").order("currency");
  const rates = (data ?? []).map((r) => ({ ...r, buy_rate: Number(r.buy_rate), sell_rate: Number(r.sell_rate) })) as ExchangeRate[];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange rates"
        description="NGN per 1 unit. Clients are quoted the SELL rate. API-sourced currencies refresh every 6 hours: buy = market, sell = market + markup."
        actions={<SyncRatesButton />}
      />
      <div className="space-y-3">
        {rates.map((r) => (
          <div key={r.currency}>
            <RateRowForm rate={r} />
            <p className="mt-1 px-1 text-xs text-slate-400">Last updated {formatDate(r.updated_at, true)}</p>
          </div>
        ))}
      </div>
      <section className="card">
        <h2 className="mb-3 font-semibold">Add a currency</h2>
        <RateRowForm />
      </section>
    </div>
  );
}
