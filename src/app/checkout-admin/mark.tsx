export function AdminMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`grid place-items-center bg-lime-400 text-brand-950 ${small ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl"}`}>
      <svg viewBox="0 0 64 64" className={small ? "h-5 w-5" : "h-6 w-6"} aria-hidden>
        <path d="M14 20l7 24 11-18 11 18 7-24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
