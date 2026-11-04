"use client";

/** A form that asks for confirmation before submitting a server action. */
export function ConfirmForm({
  action, message, children, className,
}: { action: (form: FormData) => void | Promise<void>; message: string; children: React.ReactNode; className?: string }) {
  return (
    <form action={action} className={className} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </form>
  );
}
