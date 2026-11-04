import { redirect } from "next/navigation";
import { getAssuranceLevel, requireStaffPreMfa } from "@/lib/auth";
import { MfaChallenge } from "./mfa-client";
import { signOut } from "@/app/(auth)/actions";

export default async function MfaPage() {
  await requireStaffPreMfa();
  const aal = await getAssuranceLevel();
  if (aal.current === "aal2") redirect("/admin");
  if (aal.next !== "aal2") redirect("/admin/mfa/enroll");
  return (
    <>
      <h1 className="text-xl font-bold">Two-factor authentication</h1>
      <p className="muted mb-6 mt-1 text-sm">Admin access requires a code from your authenticator app.</p>
      <MfaChallenge />
      <form action={signOut} className="mt-6 text-center"><button className="text-xs text-slate-500 hover:underline">Sign out</button></form>
    </>
  );
}
