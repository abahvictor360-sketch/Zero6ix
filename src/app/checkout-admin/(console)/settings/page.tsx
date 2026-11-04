import { CheckCircle2, XCircle } from "lucide-react";
import { adminEmails, emailLoginEnabled, passwordLoginEnabled, requireAdmin } from "@/lib/payfx/admin-auth";
import { adminStoreConfigured, getSettings, StoreError } from "@/lib/payfx/admin-store";
import { EXCHANGE_RATE, gatewayName } from "@/lib/payfx/catalog";
import { gatewayStatus } from "@/lib/payfx/gateways";
import { envValue } from "@/lib/env";
import { site } from "@/lib/site";
import { Alert, PageHeader } from "@/components/ui";
import { RateForm, TestEmailButton } from "./forms";

export const metadata = { title: "Settings" };

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 py-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      <span>{children}</span>
    </li>
  );
}

export default async function AdminSettings() {
  const admin = await requireAdmin();
  let settings: Record<string, unknown> = {};
  let settingsError = "";
  if (adminStoreConfigured()) {
    try { settings = await getSettings(); } catch (e) {
      settingsError = e instanceof StoreError && (e.code === "42P01" || e.code === "PGRST205")
        ? "The settings table is missing. Run supabase/leadloop/checkout_admin.sql in Supabase to save settings here."
        : e instanceof StoreError ? e.message : "Could not load settings.";
    }
  }
  const saved = Number(settings.usd_rate);
  const rate = Number.isFinite(saved) && saved > 0 ? saved : EXCHANGE_RATE;
  const gw = gatewayStatus();

  return (
    <>
      <PageHeader title="Settings" description="Checkout settings and how the site is connected." />
      {settingsError && <Alert tone="warning" className="mb-6">{settingsError}</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Exchange rate</h2>
          <p className="muted mb-4 mt-1 text-sm">Customers paying in US dollars are charged at this rate.</p>
          <RateForm current={rate} source={Number.isFinite(saved) && saved > 0 ? "saved here" : "default"} />
        </section>

        <section className="card">
          <h2 className="font-semibold">Payment gateways</h2>
          <p className="muted mt-1 text-sm">Keys are set in Vercel (Settings &gt; Environment Variables).</p>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
            {(["paystack", "flutterwave"] as const).map((g) => (
              <Status key={g} ok={gw[g].on}>
                <strong>{gatewayName(g)}</strong>{g === "paystack" ? " (default)" : ""}: {gw[g].on ? `connected, accepts ${gw[g].currencies.join(", ")}` : `not connected (${g === "paystack" ? "PAYSTACK_SECRET_KEY" : "FLUTTERWAVE_SECRET_KEY"} missing)`}
              </Status>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="font-semibold">Admins and sign-in</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
            {adminEmails().map((e) => <Status key={e} ok>{e}{e === admin ? " (you)" : ""}</Status>)}
            <Status ok={emailLoginEnabled()}>Email sign-in links {emailLoginEnabled() ? "on" : "off (needs RESEND_API_KEY)"}</Status>
            <Status ok={passwordLoginEnabled()}>Password sign-in {passwordLoginEnabled() ? "on" : "off (set CHECKOUT_ADMIN_PASSWORD to turn on)"}</Status>
          </ul>
          <p className="hint mt-2">To add or remove admins, edit CHECKOUT_ADMIN_EMAILS in Vercel (comma separated) and redeploy.</p>
        </section>

        <section className="card">
          <h2 className="font-semibold">Email and database</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
            <Status ok={Boolean(envValue("RESEND_API_KEY"))}>Emails send from {process.env.EMAIL_FROM ?? "the default sender"}</Status>
            <Status ok>Contact form messages go to {process.env.CONTACT_FORM_TO ?? site.email}</Status>
            <Status ok={adminStoreConfigured()}>Database (Supabase leadloop) {adminStoreConfigured() ? "connected" : "not connected (PAYFX_SUPABASE_SERVICE_ROLE_KEY missing)"}</Status>
            <Status ok={!settingsError && adminStoreConfigured()}>Admin tables {settingsError ? "missing" : adminStoreConfigured() ? "ready" : "unknown"}</Status>
          </ul>
          <div className="mt-3"><TestEmailButton /></div>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="font-semibold">Business details on invoices</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Company</dt><dd className="font-medium">{site.company}</dd></div>
            <div><dt className="text-slate-500">RC number</dt><dd className="font-medium">{process.env.NEXT_PUBLIC_RC_NUMBER ?? "–"}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{site.email}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{site.phone}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-medium">{site.address}</dd></div>
          </dl>
          <p className="hint mt-3">Ask Claude to change these, as they are part of the website code.</p>
        </section>
      </div>
    </>
  );
}
