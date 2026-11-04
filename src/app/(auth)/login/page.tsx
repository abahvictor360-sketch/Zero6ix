import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="muted mb-8 mt-2">Log in to manage your requests and payments.</p>
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">That link is invalid or has expired. Please try again.</p>}
      <LoginForm next={next} />
      <p className="muted mt-8 text-center text-sm">
        New to Web Purchase? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline dark:text-lime-400">Create an account</Link>
      </p>
    </>
  );
}
