"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Link2, Mail, Package, Receipt, Settings, Users } from "lucide-react";

const LINKS = [
  { href: "/checkout-admin", label: "Overview", icon: LayoutDashboard },
  { href: "/checkout-admin/orders", label: "Orders", icon: Receipt },
  { href: "/checkout-admin/links", label: "Payment links", icon: Link2 },
  { href: "/checkout-admin/items", label: "Items", icon: Package },
  { href: "/checkout-admin/customers", label: "Customers", icon: Users },
  { href: "/checkout-admin/messages", label: "Messages", icon: Mail },
  { href: "/checkout-admin/settings", label: "Settings", icon: Settings },
  { href: "/checkout-admin/activity", label: "Activity", icon: Activity },
];

export function AdminNav({ badges = {} }: { badges?: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm [scrollbar-width:none]" aria-label="Admin">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/checkout-admin" ? path === href : path.startsWith(href);
        const badge = badges[href] ?? 0;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${active ? "bg-brand-900 text-white dark:bg-lime-400 dark:text-brand-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}>
            <Icon className="h-4 w-4" />
            {label}
            {badge > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-4 text-white">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
