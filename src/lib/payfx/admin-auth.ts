import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hmacHex, safeEqual } from "@/lib/crypto";
import { envValue } from "@/lib/env";

/**
 * Sign-in for the checkout admin (/checkout-admin). Independent of the Web
 * Purchase accounts system, which is still switched off.
 *
 * - Admins are the emails in CHECKOUT_ADMIN_EMAILS (comma separated).
 * - Sign in with a one-time link emailed through Resend (valid 15 minutes),
 *   or with CHECKOUT_ADMIN_PASSWORD if that is set.
 * - CHECKOUT_ADMIN_SECRET signs links and sessions. Changing it (or the
 *   password) signs everyone out.
 */
export const ADMIN_BASE = "/checkout-admin";
export const DEFAULT_ADMIN = "abahvictor760@gmail.com";
const COOKIE = "co_admin";
const SESSION_TTL = 60 * 60 * 12; // 12 hours
const LINK_TTL = 60 * 15; // 15 minutes

export const adminEmails = () =>
  (envValue("CHECKOUT_ADMIN_EMAILS") || DEFAULT_ADMIN).split(",").map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e));
export const isAdminEmail = (email: string) => adminEmails().includes(email.trim().toLowerCase());

const password = () => {
  const p = envValue("CHECKOUT_ADMIN_PASSWORD");
  return p.length >= 10 ? p : "";
};
export const passwordLoginEnabled = () => Boolean(password());
export const emailLoginEnabled = () => Boolean(envValue("RESEND_API_KEY"));

/** Signing key: CHECKOUT_ADMIN_SECRET, else derived from other server-only secrets. */
function secret() {
  const s = envValue("CHECKOUT_ADMIN_SECRET");
  if (s.length >= 32) return s;
  const fallback = [envValue("PAYFX_SUPABASE_SERVICE_ROLE_KEY"), envValue("RESEND_API_KEY")].filter(Boolean).join("|");
  return fallback ? createHash("sha256").update(`checkout-admin-fallback|${fallback}`).digest("hex") : "";
}
export const adminConfigured = () => Boolean(secret()) && (emailLoginEnabled() || passwordLoginEnabled());

const key = () => createHash("sha256").update(`checkout-admin|${secret()}|${password()}`).digest("hex");
const sign = (purpose: string, payload: string) => hmacHex("sha256", key(), `${purpose}|${payload}`);
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

export function checkPassword(input: string) {
  const p = password();
  if (!p) return false;
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEqual(h(input), h(p));
}

/* ---------- One-time sign-in links ---------- */

export function createLoginToken(email: string) {
  const payload = b64(JSON.stringify({ e: email.toLowerCase(), x: Math.floor(Date.now() / 1000) + LINK_TTL, n: randomBytes(9).toString("base64url") }));
  return `${payload}.${sign("link", payload)}`;
}

/** Returns the email and nonce if the token is genuine, unexpired and still an admin. */
export function readLoginToken(token: string): { email: string; nonce: string } | null {
  const [payload, sig] = String(token).split(".");
  if (!payload || !sig || !secret() || !safeEqual(sig, sign("link", payload))) return null;
  try {
    const { e, x, n } = JSON.parse(unb64(payload)) as { e: string; x: number; n: string };
    if (!e || !n || x < Date.now() / 1000 || !isAdminEmail(e)) return null;
    return { email: e, nonce: n };
  } catch {
    return null;
  }
}

/* ---------- Sessions ---------- */

export async function startSession(email: string) {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_TTL);
  const payload = `${b64(email.toLowerCase())}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign("session", payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in admin's email, or null. */
export async function currentAdmin(): Promise<string | null> {
  if (!secret()) return null;
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [e, exp, sig] = raw.split(".");
  if (!e || !exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return null;
  if (!safeEqual(sig, sign("session", `${e}.${exp}`))) return null;
  const email = unb64(e);
  return isAdminEmail(email) ? email : null;
}

export const isAdmin = async () => Boolean(await currentAdmin());

/** Call at the top of every admin page and server action. Returns the admin's email. */
export async function requireAdmin(): Promise<string> {
  const email = await currentAdmin();
  if (!email) redirect(`${ADMIN_BASE}/login`);
  return email;
}

/* ---------- Throttle: 5 tries per IP per 15 minutes (per server instance) ---------- */

const attempts = new Map<string, { n: number; until: number }>();
export async function loginThrottle() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const now = Date.now();
  if ((attempts.get(ip)?.until ?? Infinity) < now) attempts.delete(ip);
  return {
    blocked: (attempts.get(ip)?.n ?? 0) >= 5,
    hit() {
      const cur = attempts.get(ip) ?? { n: 0, until: now + 15 * 60_000 };
      cur.n += 1;
      attempts.set(ip, cur);
    },
    reset() { attempts.delete(ip); },
  };
}

/* Used sign-in links (per instance); the admin log also records them across instances. */
export const usedNonces = new Set<string>();
