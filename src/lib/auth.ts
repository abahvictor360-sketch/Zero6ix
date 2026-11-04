import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { can, isStaffRole, type Permission } from "@/lib/permissions";
import type { UserProfile } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: UserProfile;
}

/** Current authenticated user + profile (memoised per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) return null;
  return { id: user.id, email: user.email ?? null, profile: profile as UserProfile };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export const getAssuranceLevel = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? "aal1", next: data?.nextLevel ?? "aal1" };
});

/**
 * Staff gate. Requires a staff role AND a 2FA (aal2) session.
 * Staff without an enrolled factor are sent to enrol; enrolled staff with an
 * aal1 session are sent to the challenge screen.
 */
export async function requireStaff(permission?: Permission): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isStaffRole(user.profile.role)) redirect("/dashboard");
  const aal = await getAssuranceLevel();
  if (aal.current !== "aal2") redirect(aal.next === "aal2" ? "/admin/mfa" : "/admin/mfa/enroll");
  if (permission && !can(user.profile.role, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return user;
}

/** Staff gate for the MFA screens themselves (aal1 allowed). */
export async function requireStaffPreMfa(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isStaffRole(user.profile.role)) redirect("/dashboard");
  return user;
}
