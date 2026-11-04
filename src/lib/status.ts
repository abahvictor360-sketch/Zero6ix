import type { RequestStatus, RequestType } from "./types";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  quote_sent: "Quote Sent",
  paid: "Paid",
  processing: "Processing",
  completed: "Completed",
  shipped: "Shipped",
  delivered: "Delivered",
  rejected: "Rejected",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<RequestStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  under_review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  quote_sent: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  completed: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200",
  shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  delivered: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  refunded: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

/** The happy-path progression shown in the client timeline. */
export function statusFlow(type: RequestType): RequestStatus[] {
  return type === "service"
    ? ["submitted", "under_review", "quote_sent", "paid", "processing", "completed"]
    : ["submitted", "under_review", "quote_sent", "paid", "processing", "shipped", "delivered"];
}

/** Statuses an admin may move a request to from its current status. */
export function allowedTransitions(current: RequestStatus, type: RequestType): RequestStatus[] {
  const map: Record<RequestStatus, RequestStatus[]> = {
    draft: ["submitted", "rejected", "cancelled"],
    submitted: ["under_review", "rejected", "cancelled"],
    under_review: ["rejected", "cancelled"], // quote_sent happens via "Send quote"
    quote_sent: ["under_review", "rejected", "cancelled"], // paid happens via payment
    paid: ["processing", "refunded"],
    processing: type === "service" ? ["completed", "refunded"] : ["shipped", "refunded"],
    shipped: ["delivered"],
    completed: [],
    delivered: [],
    rejected: ["under_review"],
    refunded: [],
    cancelled: [],
  };
  return map[current];
}

export const TERMINAL_STATUSES: RequestStatus[] = ["completed", "delivered", "rejected", "refunded", "cancelled"];
export const OPEN_STATUSES: RequestStatus[] = ["submitted", "under_review", "quote_sent", "paid", "processing", "shipped"];
