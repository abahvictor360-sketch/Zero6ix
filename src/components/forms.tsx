"use client";
import { createContext, startTransition, useContext } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Alert } from "./ui";
import type { ActionState } from "@/lib/validation";

const PendingContext = createContext<boolean | null>(null);

/**
 * Form that dispatches a server action WITHOUT React 19's automatic reset, so
 * the visitor's input survives validation errors. Pass the dispatcher from
 * useActionState as `action` and its isPending flag as `pending`.
 */
export function ActionForm({
  action, pending, children, ref, ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (data: FormData) => void;
  pending: boolean;
  ref?: React.Ref<HTMLFormElement>;
}) {
  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        {...props}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}

export function SubmitButton({
  children, className = "btn btn-dark", pendingText = "Please wait…", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const status = useFormStatus();
  const ctx = useContext(PendingContext);
  const pending = ctx ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? (<><Loader2 className="h-4 w-4 animate-spin" /> {pendingText}</>) : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState | undefined | null }) {
  if (!state) return null;
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export const fieldError = (state: ActionState | undefined | null, key: string) => state?.fieldErrors?.[key];
