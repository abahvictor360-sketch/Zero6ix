"use client";
import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/forms";
import { deleteProductAction } from "../../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? It will be removed from the checkout page. Past invoices are not affected.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn btn-sm border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" pendingText="Deleting…">
        <Trash2 className="h-4 w-4" /> Delete
      </SubmitButton>
    </form>
  );
}
