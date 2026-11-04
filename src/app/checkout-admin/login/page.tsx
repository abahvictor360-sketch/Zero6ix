import { redirect } from "next/navigation";
import { ADMIN_BASE, adminConfigured, emailLoginEnabled, isAdmin, passwordLoginEnabled } from "@/lib/payfx/admin-auth";
import { Alert } from "@/components/ui";
import { LoginForm } from "./login-form";
import { AdminMark } from "../mark";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  expired: "That sign-in link is invalid or has expired. Request a new one.",
  used: "That sign-in link was already used. Request a new one.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await isAdmin()) redirect(ADMIN_BASE);
  const { e } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm">
        <AdminMark />
        <h1 className="mt-4 text-xl font-bold">Checkout admin</h1>
        <p className="muted mt-1 text-sm">Sign in with your admin email. We&apos;ll email you a one-time sign-in link.</p>
        {e && ERRORS[e] && <Alert tone="error" className="mt-4">{ERRORS[e]}</Alert>}
        {!adminConfigured() && (
          <Alert tone="warning" className="mt-4">Sign-in is not set up yet: the email service (RESEND_API_KEY) is missing.</Alert>
        )}
        <LoginForm passwordEnabled={passwordLoginEnabled()} emailEnabled={emailLoginEnabled()} />
      </div>
    </main>
  );
}
