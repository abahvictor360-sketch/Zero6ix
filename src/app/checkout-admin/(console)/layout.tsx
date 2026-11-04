import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/payfx/admin-auth";
import { adminStoreConfigured } from "@/lib/payfx/admin-store";
import { Alert } from "@/components/ui";
import { logoutAction } from "../actions";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-brand-950/90">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3">
          <Link href="/checkout-admin" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-400 text-brand-950">
              <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden>
                <path d="M14 20l7 24 11-18 11 18 7-24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="hidden sm:inline">Checkout admin</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <a href="/checkout" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm !px-2.5 md:!px-3.5" aria-label="Open checkout page">
              <ExternalLink className="h-4 w-4" /><span className="hidden md:inline">View checkout</span>
            </a>
            <form action={logoutAction}>
              <button className="btn btn-outline btn-sm !px-2.5 md:!px-3.5" aria-label="Sign out"><LogOut className="h-4 w-4" /><span className="hidden md:inline">Sign out</span></button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {!adminStoreConfigured() && (
          <Alert tone="warning" className="mb-6">
            The database key is not set. Add <code>PAYFX_SUPABASE_SERVICE_ROLE_KEY</code> in Vercel and redeploy to load items and orders.
          </Alert>
        )}
        {children}
      </main>
    </>
  );
}
