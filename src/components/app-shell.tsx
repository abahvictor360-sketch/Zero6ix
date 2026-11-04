"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, LogOut, Menu, X, LayoutDashboard, FileText, PlusCircle, CreditCard, Building2, UserRound,
  Inbox, Coins, Settings2, Users, Mail, MessageCircle, ShieldAlert, ScrollText, UserCog, KeyRound,
} from "lucide-react";

const ICONS = {
  LayoutDashboard, FileText, PlusCircle, CreditCard, Building2, UserRound, Bell, Inbox, Coins,
  Settings2, Users, Mail, MessageCircle, ShieldAlert, ScrollText, UserCog, KeyRound,
};
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/format";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  mobile?: boolean;
  badge?: number;
}

/** Shared responsive shell for the client dashboard and admin area. */
export function AppShell({
  nav, user, unread, notificationsHref, signOutAction, children, variant = "client",
}: {
  nav: NavItem[];
  user: { name: string; email: string | null; roleLabel?: string };
  unread: number;
  notificationsHref: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
  variant?: "client" | "admin";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(`${href}/`));

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <ul className="space-y-1">
      {nav.map((n) => {
        const Icon = ICONS[n.icon];
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onClick}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(n.href) ? "bg-lime-400 text-brand-950" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{n.badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-[#06140f] lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-brand-900 p-4 text-white dark:bg-[#0a1d15] lg:flex">
        <div className="px-2 py-2"><Logo light /></div>
        {variant === "admin" && <p className="mt-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-lime-400">Admin console</p>}
        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Sidebar"><NavLinks /></nav>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-white/60">{user.roleLabel ?? user.email}</p>
          <form action={signOutAction}>
            <button className="mt-3 flex items-center gap-2 text-xs text-white/70 hover:text-white"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-[#06140f]/90 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <span className="lg:hidden"><Logo /></span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-slate-600 dark:text-slate-300" />
            <Link href={notificationsHref} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300" aria-label={`Notifications (${unread} unread)`}>
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-900 p-4 text-white">
              <div className="flex items-center justify-between px-2"><Logo light /><button onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
              <nav className="mt-6 flex-1 overflow-y-auto"><NavLinks onClick={() => setOpen(false)} /></nav>
              <form action={signOutAction}><button className="flex items-center gap-2 px-3 py-2 text-sm text-white/70"><LogOut className="h-4 w-4" /> Sign out</button></form>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-[#0a1d15] lg:hidden" aria-label="Quick">
          {nav.filter((n) => n.mobile).slice(0, 4).map((n) => {
            const Icon = ICONS[n.icon];
            return (
              <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", isActive(n.href) ? "text-brand-700 dark:text-lime-400" : "text-slate-500")}>
                <Icon className="h-5 w-5" /> {n.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
