import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="muted mb-8 mt-2">Free to join. Pay only when you order.</p>
      <SignupForm />
      <p className="muted mt-8 text-center text-sm">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline dark:text-lime-400">Log in</Link>
      </p>
    </>
  );
}
