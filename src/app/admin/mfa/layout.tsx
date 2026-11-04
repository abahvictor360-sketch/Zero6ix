import { Logo } from "@/components/ui";

export const metadata = { title: "Admin verification", robots: { index: false } };

export default function MfaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-slate-900 shadow-2xl dark:bg-[#0b1f17] dark:text-white">
        <Logo className="mb-6" />
        {children}
      </div>
    </div>
  );
}
