import { ChevronDown } from "lucide-react";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <p className="muted mt-3 text-sm leading-6">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
