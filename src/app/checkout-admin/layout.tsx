import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Checkout admin", template: "%s · Checkout admin" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function CheckoutAdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-brand-950 dark:text-slate-100">{children}</div>;
}
