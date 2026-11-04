import Link from "next/link";
import { Lock, ShieldCheck, Scale } from "lucide-react";
import { Logo } from "@/components/ui";
import { accountsEnabled, site } from "@/lib/site";

const COLS = [
  { title: "Product", links: [["Services", "/services"], ["Shop & Ship", "/shop-and-ship"], ["Pricing & calculator", "/pricing"], ...(accountsEnabled ? [["Track an order", "/track"]] : [])] },
  { title: "Company", links: [["About us", "/about"], ["Contact us", "/contact"], ["FAQ", "/faq"]] },
  { title: "Legal", links: [["Terms of Service", "/legal/terms"], ["Privacy Policy", "/legal/privacy"], ["Refund Policy", "/legal/refund"], ["Prohibited Items", "/legal/prohibited-items"]] },
];

export function SiteFooter() {
  return (
    <footer className="bg-brand-950 text-white">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-white/70">
            Pay for online services and shop from foreign stores — in Naira or any African currency, at home or abroad.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-lime-400" /> Secured by Paystack & Flutterwave</li>
            <li className="flex items-center gap-2"><Scale className="h-4 w-4 text-lime-400" /> Legal requests only</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-lime-400" /> Every order reviewed by a human</li>
          </ul>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold text-lime-400">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}><Link href={href} className="text-white/75 hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p className="max-w-3xl">© {new Date().getFullYear()} {site.name} — a service of {site.company}{site.rcNumber ? ` (${site.rcNumber})` : ""}. {site.address}. {site.phone} · {site.email}</p>
          <p className="shrink-0">We never store your card details.</p>
        </div>
      </div>
    </footer>
  );
}
