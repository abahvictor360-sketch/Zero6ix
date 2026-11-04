export function formatMoney(amount: number | string | null | undefined, currency = "NGN") {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatNumber(n: number, digits = 2) {
  return new Intl.NumberFormat("en-NG", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function formatDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Africa/Lagos",
  }).format(new Date(d));
}

export function timeAgo(d: string | Date) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const days = Math.round(h / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** Normalise a Nigerian phone number to E.164 (+234…). Returns null if invalid. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let p = input.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (p.startsWith("0") && p.length === 11) p = `+234${p.slice(1)}`;
  if (/^234\d{10}$/.test(p)) p = `+${p}`;
  if (!p.startsWith("+")) p = `+${p}`;
  return /^\+\d{10,15}$/.test(p) ? p : null;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
