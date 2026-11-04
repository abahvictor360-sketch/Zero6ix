"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="muted mt-2 max-w-md">{error.message && !error.message.includes("Server Components") ? error.message : "An unexpected error occurred. Please try again."}</p>
        {error.digest && <p className="mt-1 text-xs text-slate-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn btn-dark">Try again</button>
          <Link href="/" className="btn btn-outline">Home</Link>
        </div>
      </div>
    </main>
  );
}
