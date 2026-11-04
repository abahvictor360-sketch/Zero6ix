import Link from "next/link";
import { readLoginToken } from "@/lib/payfx/admin-auth";
import { SubmitButton } from "@/components/forms";
import { confirmLinkAction } from "../actions";
import { AdminMark } from "../mark";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

/**
 * Landing page for the emailed link. Signing in needs a button press, so
 * email security scanners that open links can't use the one-time link up.
 */
export default async function AdminAuthPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const info = readLoginToken(t);
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm">
        <AdminMark />
        {info ? (
          <>
            <h1 className="mt-4 text-xl font-bold">Sign in to the checkout admin</h1>
            <p className="muted mt-1 text-sm">Signing in as <strong className="text-slate-900 dark:text-white">{info.email}</strong></p>
            <form action={confirmLinkAction} className="mt-5">
              <input type="hidden" name="t" value={t} />
              <SubmitButton className="btn btn-dark w-full" pendingText="Signing in…">Continue</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-bold">Link expired</h1>
            <p className="muted mt-1 text-sm">This sign-in link is invalid or has expired. Links work for 15 minutes.</p>
            <Link href="/checkout-admin/login" className="btn btn-dark mt-5 w-full">Get a new link</Link>
          </>
        )}
      </div>
    </main>
  );
}
