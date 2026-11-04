import Link from "next/link";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status";
import { cn } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)} aria-label="Web Purchase home">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-400 text-brand-950">
        <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden>
          <path d="M14 20l7 24 11-18 11 18 7-24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={cn("text-lg", light ? "text-white" : "text-brand-900 dark:text-white")}>
        Web<span className={light ? "text-lime-400" : "text-brand-600 dark:text-lime-400"}>Purchase</span>
      </span>
    </Link>
  );
}

export function StatusBadge({ status, className = "" }: { status: RequestStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    blue: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Field({
  label, name, error, hint, children, required, className = "",
}: {
  label: string; name: string; error?: string[] | string; hint?: string; children: React.ReactNode; required?: boolean; className?: string;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {msg ? <p className="field-error" id={`${name}-error`}>{msg}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Alert({ tone = "info", children, className = "" }: { tone?: "info" | "success" | "error" | "warning"; children: React.ReactNode; className?: string }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
    warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="muted mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/15">
      <p className="font-semibold">{title}</p>
      {description && <p className="muted mx-auto mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {icon && <span className="text-brand-600 dark:text-lime-400">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.4 9.4 0 01-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 01-1.44-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.98 6.67 2.77a9.38 9.38 0 012.76 6.68c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0012.04.7C5.77.7.66 5.8.66 12.07c0 2 .52 3.96 1.52 5.69L.57 23.7l6.08-1.6a11.33 11.33 0 005.39 1.37h.01c6.27 0 11.38-5.1 11.38-11.38 0-3.04-1.18-5.9-3.35-8.06z" />
    </svg>
  );
}
