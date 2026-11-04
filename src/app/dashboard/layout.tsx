import type { Metadata } from "next";
import { AppShell, type NavItem } from "@/components/app-shell";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Web Purchase" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", mobile: true },
    { href: "/dashboard/requests", label: "My requests", icon: "FileText", mobile: true },
    { href: "/dashboard/requests/new", label: "New request", icon: "PlusCircle", mobile: true },
    { href: "/dashboard/payments", label: "Payments", icon: "CreditCard", mobile: true },
    { href: "/dashboard/organisation", label: "Organisation", icon: "Building2" },
    { href: "/dashboard/notifications", label: "Notifications", icon: "Bell", badge: count ?? 0 },
    { href: "/dashboard/profile", label: "Profile & KYC", icon: "UserRound" },
  ];

  return (
    <AppShell
      nav={nav}
      user={{ name: user.profile.full_name || "Your account", email: user.email }}
      unread={count ?? 0}
      notificationsHref="/dashboard/notifications"
      signOutAction={signOut}
    >
      {children}
      <div className="hidden lg:block"><WhatsAppButton /></div>
    </AppShell>
  );
}
