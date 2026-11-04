import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hmacHex, safeEqual } from "@/lib/crypto";
import { envValue } from "@/lib/env";

/**
 * Password login for the checkout admin (/checkout-admin). Independent of the
 * Web Purchase accounts system, which is still switched off.
 *
 * Env: CHECKOUT_ADMIN_PASSWORD (at least 10 characters). Changing it signs
 * everyone out, because it is part of the session signing key.
 */
export const ADMIN_BASE = "/checkout-admin";
const COOKIE = "co_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

const password = () => {
  const p = envValue("CHECKOUT_ADMIN_PASSWORD");
  return p.length >= 10 ? p : "";
};
export const adminConfigured = () => Boolean(password());

const signingKey = () => createHash("sha256").update(`checkout-admin|${password()}`).digest("hex");
const sign = (exp: string) => hmacHex("sha256", signingKey(), `session|${exp}`);

export function checkPassword(input: string) {
  const p = password();
  if (!p) return false;
  // Compare fixed-length digests so the check takes the same time whatever the input.
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEqual(h(input), h(p));
}

export async function startSession() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, sign(exp));
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect(`${ADMIN_BASE}/login`);
}

/* Simple per-instance login throttle: 5 failed tries per IP per 15 minutes. */
const attempts = new Map<string, { n: number; until: number }>();
export async function loginThrottle() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.until < now) attempts.delete(ip);
  return {
    blocked: (attempts.get(ip)?.n ?? 0) >= 5,
    fail() {
      const cur = attempts.get(ip) ?? { n: 0, until: now + 15 * 60_000 };
      cur.n += 1;
      attempts.set(ip, cur);
    },
    reset() { attempts.delete(ip); },
  };
}
