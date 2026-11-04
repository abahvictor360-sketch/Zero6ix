"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/checkout-admin", label: "Overview" },
  { href: "/checkout-admin/items", label: "Items" },
  { href: "/checkout-admin/orders", label: "Orders" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/checkout-admin" ? path === l.href : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
            className={`rounded-full px-2.5 py-1.5 font-medium transition sm:px-3 ${active ? "bg-brand-900 text-white dark:bg-lime-400 dark:text-brand-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
