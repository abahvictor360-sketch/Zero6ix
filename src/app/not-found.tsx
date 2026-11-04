import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 text-6xl font-bold text-brand-700 dark:text-lime-400">404</p>
        <h1 className="mt-3 text-2xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="muted mt-2">The link may be broken or the page may have moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-dark">Go home</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </div>
    </main>
  );
}
