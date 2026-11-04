import { Alert } from "@/components/ui";

/** Shows ?notice= / ?error= messages left by server actions. */
export function Flash({ notice, error }: { notice?: string; error?: string }) {
  return (
    <>
      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
    </>
  );
}
