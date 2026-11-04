import { CheckCircle2, Mail, Smartphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PhoneVerification } from "./phone-verification";

export const metadata = { title: "Verify your account" };

export default async function VerifyPage() {
  const user = await requireUser("/dashboard/verify");
  const p = user.profile;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Verify your account" description="For your security, all accounts verify an email address and phone number." />
      <div className="space-y-4">
        <div className="card flex items-center gap-4">
          <Mail className="h-6 w-6 text-brand-600 dark:text-lime-400" />
          <div className="flex-1">
            <p className="font-semibold">Email</p>
            <p className="muted text-sm">{p.email}</p>
          </div>
          {p.email_verified ? <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-label="Verified" /> : <span className="text-sm text-amber-600">Check your inbox</span>}
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <Smartphone className="h-6 w-6 text-brand-600 dark:text-lime-400" />
            <div className="flex-1">
              <p className="font-semibold">Phone number</p>
              <p className="muted text-sm">{p.phone ?? "Not added"}</p>
            </div>
            {p.phone_verified && <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-label="Verified" />}
          </div>
          {!p.phone_verified && <div className="mt-5"><PhoneVerification defaultPhone={p.phone ?? ""} /></div>}
        </div>
      </div>
    </div>
  );
}
