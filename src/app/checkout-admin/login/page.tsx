import { redirect } from "next/navigation";
import { ADMIN_BASE, adminConfigured, isAdmin } from "@/lib/payfx/admin-auth";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect(ADMIN_BASE);
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400 text-brand-950">
          <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
            <path d="M14 20l7 24 11-18 11 18 7-24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-4 text-xl font-bold">Checkout admin</h1>
        <p className="muted mt-1 text-sm">Manage checkout items and see orders.</p>
        {!adminConfigured() && (
          <Alert tone="warning" className="mt-4">
            Not set up yet. Add <code>CHECKOUT_ADMIN_PASSWORD</code> (at least 10 characters) in Vercel, then redeploy.
          </Alert>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
