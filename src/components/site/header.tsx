"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui";
import { accountsEnabled } from "@/lib/site";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/shop-and-ship", label: "Shop & Ship" },
  { href: "/pricing", label: "Pricing" },
  ...(accountsEnabled ? [{ href: "/track", label: "Track Order" }] : []),
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ signedIn, isStaff }: { signedIn: boolean; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-white/10 bg-brand-900/95 text-white backdrop-blur dark:bg-[#06140f]/90">
      <div className="container flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Logo light />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("rounded-full px-3 py-1.5 text-sm text-white/80 transition hover:text-white", pathname === n.href && "bg-white/10 text-white")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {!accountsEnabled ? (
            <Link href="/contact" className="btn btn-primary btn-sm">Contact us</Link>
          ) : signedIn ? (
            <Link href={isStaff ? "/admin" : "/dashboard"} className="btn btn-primary btn-sm">
              {isStaff ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost-light btn-sm hidden sm:inline-flex">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/10 lg:hidden" aria-label="Mobile">
          <div className="container grid gap-1 py-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-white/90 hover:bg-white/10">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 px-1">
              {accountsEnabled && !signedIn && <Link href="/login" className="btn btn-ghost-light btn-sm flex-1">Log in</Link>}
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
