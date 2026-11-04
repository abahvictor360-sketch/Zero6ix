import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Notifications" };

async function markRead() {
  "use server";
  const staff = await requireStaff();
  await createAdminClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", staff.id).is("read_at", null);
  revalidatePath("/admin", "layout");
}

export default async function AdminNotifications() {
  const staff = await requireStaff();
  const { data } = await createAdminClient().from("notifications").select("*").eq("user_id", staff.id).order("created_at", { ascending: false }).limit(100);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" actions={<form action={markRead}><button className="btn btn-outline btn-sm">Mark all as read</button></form>} />
      {!data?.length ? <EmptyState title="Nothing new" /> : (
        <ul className="card divide-y divide-slate-100 p-0 dark:divide-white/5">
          {data.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? "/admin"} className="flex gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "" : "bg-lime-500"}`} />
                <div><p className={`text-sm ${n.read_at ? "" : "font-semibold"}`}>{n.title}</p><p className="muted text-sm">{n.body}</p><p className="text-xs text-slate-400">{timeAgo(n.created_at)}</p></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
