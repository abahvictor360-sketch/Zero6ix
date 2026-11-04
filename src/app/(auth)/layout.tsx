import { Lock, Scale, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 opacity-50" aria-hidden />
        <Logo light className="relative" />
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">Pay for anything online,<br /><span className="text-lime-400">in any currency.</span></h2>
          <ul className="mt-8 space-y-3 text-white/80">
            <li className="flex items-center gap-3"><Lock className="h-5 w-5 text-lime-400" /> Payments secured by Paystack & Flutterwave</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-lime-400" /> Encrypted credentials & verified accounts</li>
            <li className="flex items-center gap-3"><Scale className="h-5 w-5 text-lime-400" /> Legal requests only — every order reviewed</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Web Purchase</p>
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="lg:invisible"><Logo /></span>
          <ThemeToggle className="text-slate-600 dark:text-slate-300" />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
