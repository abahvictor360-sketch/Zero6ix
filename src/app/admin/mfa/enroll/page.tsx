import { redirect } from "next/navigation";
import { getAssuranceLevel, requireStaffPreMfa } from "@/lib/auth";
import { MfaEnroll } from "../mfa-client";

export default async function MfaEnrollPage() {
  await requireStaffPreMfa();
  const aal = await getAssuranceLevel();
  if (aal.current === "aal2") redirect("/admin");
  if (aal.next === "aal2") redirect("/admin/mfa");
  return (
    <>
      <h1 className="text-xl font-bold">Set up two-factor authentication</h1>
      <p className="muted mb-6 mt-1 text-sm">Required for all staff accounts. You&apos;ll only need to do this once.</p>
      <MfaEnroll />
    </>
  );
}
