import { Check, Circle, XCircle } from "lucide-react";
import { STATUS_LABELS, statusFlow } from "@/lib/status";
import { formatDate } from "@/lib/format";
import type { RequestEvent, RequestStatus, RequestType } from "@/lib/types";

/** Progress stepper (happy path) followed by the detailed event log. */
export function RequestTimeline({
  type, status, events,
}: { type: RequestType; status: RequestStatus; events: Pick<RequestEvent, "title" | "note" | "status" | "created_at">[] }) {
  const flow = statusFlow(type);
  const failed = ["rejected", "refunded", "cancelled"].includes(status);
  const currentIndex = flow.indexOf(status);
  return (
    <div className="space-y-6">
      {failed ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">
          <XCircle className="h-5 w-5" /> {STATUS_LABELS[status]}
        </div>
      ) : (
        <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Progress">
          {flow.map((s, i) => {
            const done = currentIndex >= i;
            return (
              <li key={s} className="min-w-[84px] flex-1">
                <div className={`h-1.5 rounded-full ${done ? "bg-brand-600 dark:bg-lime-400" : "bg-slate-200 dark:bg-white/10"}`} />
                <p className={`mt-2 text-[11px] font-medium ${done ? "" : "text-slate-400"}`}>{STATUS_LABELS[s]}</p>
              </li>
            );
          })}
        </ol>
      )}
      <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-white/10">
        {[...events].reverse().map((e, i) => (
          <li key={`${e.created_at}-${i}`} className="relative">
            <span className={`absolute -left-[31px] grid h-4 w-4 place-items-center rounded-full ${i === 0 ? "bg-brand-600 text-white dark:bg-lime-400 dark:text-brand-950" : "bg-slate-200 dark:bg-white/20"}`}>
              {i === 0 ? <Check className="h-2.5 w-2.5" /> : <Circle className="h-1.5 w-1.5" />}
            </span>
            <p className="text-sm font-semibold">{e.title}</p>
            {e.note && <p className="muted text-sm">{e.note}</p>}
            <p className="text-xs text-slate-400">{formatDate(e.created_at, true)}</p>
          </li>
        ))}
        {!events.length && <li className="muted text-sm">No updates yet.</li>}
      </ol>
    </div>
  );
}
