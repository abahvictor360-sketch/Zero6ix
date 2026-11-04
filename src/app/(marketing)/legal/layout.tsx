import Link from "next/link";

/**
 * NOTE: The legal copy in this folder is a well-structured starting template.
 * Have it reviewed by a Nigerian lawyer (NDPA 2023, CBN FX rules, Customs
 * import prohibition list, consumer-protection law) before launch.
 */
const LINKS = [
  ["/legal/terms", "Terms of Service"],
  ["/legal/privacy", "Privacy Policy"],
  ["/legal/refund", "Refund Policy"],
  ["/legal/prohibited-items", "Prohibited Items & Services"],
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Legal" className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex gap-2 overflow-x-auto lg:flex-col">
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block whitespace-nowrap rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5">{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose-legal max-w-3xl">{children}</article>
    </div>
  );
}
