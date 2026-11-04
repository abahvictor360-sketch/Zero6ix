"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Alert } from "./ui";
import type { ActionState } from "@/lib/validation";

export function SubmitButton({
  children, className = "btn btn-dark", pendingText = "Please wait…", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
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
