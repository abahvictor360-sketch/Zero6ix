"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import { absoluteUrl } from "@/lib/site";
import { isStaffRole } from "@/lib/permissions";
import { phoneSchema, zodErrorState, type ActionState } from "@/lib/validation";

/** Only allow same-site relative redirects (prevents open redirects). */
function safeNext(next: FormDataEntryValue | null, fallback = "/dashboard") {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : fallback;
}

const NOT_CONFIGURED: ActionState = { error: "Authentication is not configured. Set the Supabase environment variables." };

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`login:${await clientIp()}`, 20, 900))) return { error: "Too many sign-in attempts. Try again in 15 minutes." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message.includes("Email not confirmed") ? "Please confirm your email first. Check your inbox." : "Incorrect email or password." };
  }
  const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
  redirect(isStaffRole(profile?.role) ? "/admin" : safeNext(form.get("next")));
}

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const schema = z.object({
    full_name: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: phoneSchema,
    password: z.string().min(10, "Use at least 10 characters").max(72)
      .regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    account_type: z.enum(["individual", "organisation"]),
    organisation_name: z.string().trim().max(160).optional(),
    terms: z.literal("on", { error: "You must accept the Terms of Service and Privacy Policy" }),
  }).refine((d) => d.account_type === "individual" || (d.organisation_name?.length ?? 0) >= 2, {
    path: ["organisation_name"], message: "Enter your organisation's name",
  });
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`signup:${await clientIp()}`, 5, 3600))) return { error: "Too many sign-ups from this network. Try again later." };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: absoluteUrl("/auth/callback?next=/dashboard/verify"),
      data: { full_name: d.full_name, account_type: d.account_type, organisation_name: d.organisation_name, phone: d.phone },
    },
  });
  if (error) return { error: error.message };
  return { ok: true, message: `We've sent a confirmation link to ${d.email}. Click it to activate your account, then verify your phone number.` };
}

export async function sendLoginOtp(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z.object({ phone: phoneSchema }).safeParse({ phone: form.get("phone") });
  if (!parsed.success) return zodErrorState(parsed.error);
  if (!(await rateLimit(`otp:${await clientIp()}`, 5, 900))) return { error: "Too many codes requested. Try again in 15 minutes." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone, options: { shouldCreateUser: false } });
  if (error) return { error: "We couldn't send a code to that number. Use the number verified on your account, or sign in with email." };
  return { ok: true, message: "Code sent by SMS.", data: { phone: parsed.data.phone } };
}

export async function verifyLoginOtp(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z.object({ phone: phoneSchema, token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") })
    .safeParse({ phone: form.get("phone"), token: form.get("token") });
  if (!parsed.success) return { ...zodErrorState(parsed.error), data: { phone: form.get("phone") } };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone: parsed.data.phone, token: parsed.data.token, type: "sms" });
  if (error || !data.user) return { error: "Invalid or expired code.", data: { phone: parsed.data.phone } };
  const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
  redirect(isStaffRole(profile?.role) ? "/admin" : safeNext(form.get("next")));
}

export async function forgotPassword(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email", fieldErrors: { email: ["Enter a valid email"] } };
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 3600))) return { error: "Too many requests. Try again later." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: absoluteUrl("/auth/callback?next=/reset-password") });
  // Same response whether or not the account exists (no account enumeration).
  return { ok: true, message: "If an account exists for that email, you'll receive a reset link shortly." };
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({
    password: z.string().min(10, "Use at least 10 characters").max(72).regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    confirm: z.string(),
  }).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return zodErrorState(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/dashboard?password=updated");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
