import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/payfx/admin-auth";
import { adminStoreConfigured, countNewMessages } from "@/lib/payfx/admin-store";
import { Alert } from "@/components/ui";
import { logoutAction } from "../actions";
import { AdminMark } from "../mark";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const newMessages = adminStoreConfigured() ? await countNewMessages() : 0;
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-brand-950/95">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-3">
          <Link href="/checkout-admin" className="flex items-center gap-2 font-bold">
            <AdminMark small />
            <span>Checkout admin</span>
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="hidden truncate text-sm text-slate-500 lg:inline" title={admin}>{admin}</span>
            <a href="/checkout" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm !px-2.5 md:!px-3.5" aria-label="Open checkout page">
              <ExternalLink className="h-4 w-4" /><span className="hidden md:inline">View checkout</span>
            </a>
            <form action={logoutAction}>
              <button className="btn btn-outline btn-sm !px-2.5 md:!px-3.5" aria-label="Sign out"><LogOut className="h-4 w-4" /><span className="hidden md:inline">Sign out</span></button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-2">
          <AdminNav badges={{ "/checkout-admin/messages": newMessages }} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {!adminStoreConfigured() && (
          <Alert tone="warning" className="mb-6">
            The database key is not set. Add <code>PAYFX_SUPABASE_SERVICE_ROLE_KEY</code> in Vercel and redeploy to load orders, items and messages.
          </Alert>
        )}
        {children}
      </main>
    </>
  );
}
