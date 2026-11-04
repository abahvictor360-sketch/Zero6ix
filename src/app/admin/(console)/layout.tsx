import { AppShell, type NavItem } from "@/components/app-shell";
import { requireStaff } from "@/lib/auth";
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: { default: "Admin", template: "%s · Admin · Web Purchase" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const db = createAdminClient();
  const [{ count: unread }, { count: pendingReview }, { count: handoffs }, { count: newContacts }] = await Promise.all([
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", staff.id).is("read_at", null),
    db.from("requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "draft"]),
    db.from("whatsapp_conversations").select("id", { count: "exact", head: true }).eq("handoff", true),
    db.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  const items: (NavItem & { perm?: Permission })[] = [
    { href: "/admin", label: "Overview", icon: "LayoutDashboard", mobile: true },
    { href: "/admin/requests", label: "Requests", icon: "Inbox", mobile: true, perm: "requests.view", badge: pendingReview ?? 0 },
    { href: "/admin/rates", label: "Exchange rates", icon: "Coins", perm: "rates.manage" },
    { href: "/admin/fees", label: "Fees & shipping", icon: "Settings2", perm: "fees.manage" },
    { href: "/admin/customers", label: "Customers & KYC", icon: "Users", mobile: true, perm: "customers.view" },
    { href: "/admin/contacts", label: "Contact forms", icon: "Mail", perm: "contacts.view", badge: newContacts ?? 0 },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: "MessageCircle", mobile: true, perm: "whatsapp.view", badge: handoffs ?? 0 },
    { href: "/admin/keywords", label: "Prohibited keywords", icon: "ShieldAlert", perm: "keywords.manage" },
    { href: "/admin/team", label: "Team & roles", icon: "UserCog", perm: "team.manage" },
    { href: "/admin/audit", label: "Audit log", icon: "ScrollText", perm: "audit.view" },
  ];
  const nav = items.filter((i) => !i.perm || can(staff.profile.role, i.perm)).map(({ perm: _perm, ...rest }) => rest);

  return (
    <AppShell
      variant="admin"
      nav={nav}
      user={{ name: staff.profile.full_name || staff.email || "Staff", email: staff.email, roleLabel: ROLE_LABELS[staff.profile.role] }}
      unread={unread ?? 0}
      notificationsHref="/admin/notifications"
      signOutAction={signOut}
    >
      {children}
    </AppShell>
  );
}
