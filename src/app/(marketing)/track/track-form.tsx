"use client";
import { useActionState } from "react";
import { ExternalLink, PackageSearch } from "lucide-react";
import { trackOrder, type TrackState } from "./actions";
import { Field, StatusBadge, Alert } from "@/components/ui";
import { ActionForm, SubmitButton, fieldError } from "@/components/forms";
import { RequestTimeline } from "@/components/request-timeline";
import { formatDate } from "@/lib/format";

export function TrackForm({ initialRef }: { initialRef?: string }) {
  const [state, action, actionPending] = useActionState<TrackState, FormData>(trackOrder, {});
  const r = state.result;
  return (
    <div className="space-y-6">
      <ActionForm action={action} pending={actionPending} className="card grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Order ID" name="reference" error={fieldError(state, "reference")}>
          <input id="reference" name="reference" className="input uppercase" placeholder="WP-100123" defaultValue={initialRef} required autoComplete="off" />
        </Field>
        <Field label="Email or phone on the order" name="contact" error={fieldError(state, "contact")}>
          <input id="contact" name="contact" className="input" placeholder="you@email.com or 0803…" required />
        </Field>
        <SubmitButton className="btn btn-dark h-[42px]" pendingText="Checking…"><PackageSearch className="h-4 w-4" /> Track</SubmitButton>
      </ActionForm>
      {state.error && !state.fieldErrors && <Alert tone="error">{state.error}</Alert>}
      {r && (
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{r.reference} · {r.type === "item" ? "Item purchase" : "Service payment"}</p>
              <h2 className="mt-1 text-xl font-semibold">{r.title}</h2>
              <p className="muted text-sm">Submitted {formatDate(r.created_at, true)}</p>
            </div>
            <StatusBadge status={r.status} className="text-sm" />
          </div>
          {r.shipment?.tracking_number && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5">
              <p className="font-semibold">{r.shipment.carrier ?? "Courier"} · {r.shipment.tracking_number}</p>
              {r.shipment.estimated_delivery && <p className="muted">Estimated delivery: {formatDate(r.shipment.estimated_delivery)}</p>}
              {r.shipment.tracking_url && (
                <a href={r.shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700 underline dark:text-lime-400">
                  Track with carrier <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
          <div className="mt-6"><RequestTimeline type={r.type} status={r.status} events={r.events} /></div>
        </div>
      )}
    </div>
  );
}
