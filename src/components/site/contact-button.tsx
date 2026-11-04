"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

/** Floating "Contact us" button on every page (hidden on the contact page itself). */
export function ContactButton() {
  const pathname = usePathname();
  if (pathname === "/contact" || pathname.startsWith("/checkout") || pathname.startsWith("/payfx")) return null;
  return (
    <Link
      href="/contact"
      aria-label="Contact Web Purchase"
      className="fixed bottom-5 right-5 z-50 print:hidden flex items-center gap-2 rounded-full bg-lime-400 p-3.5 text-brand-950 shadow-lg shadow-black/20 ring-1 ring-brand-900/10 transition hover:scale-105 hover:bg-lime-300 sm:px-5"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden text-sm font-semibold sm:inline">Contact us</span>
    </Link>
  );
}
