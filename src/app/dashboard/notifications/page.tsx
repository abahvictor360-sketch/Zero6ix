import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { markAllNotificationsRead } from "../actions";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const items = data ?? [];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        actions={items.some((n) => !n.read_at) && (
          <form action={markAllNotificationsRead}><button className="btn btn-outline btn-sm">Mark all as read</button></form>
        )}
      />
      {items.length === 0 ? <EmptyState title="You're all caught up" /> : (
        <ul className="card divide-y divide-slate-100 p-0 dark:divide-white/5">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? "#"} className="flex gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-lime-500"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read_at ? "" : "font-semibold"}`}>{n.title}</p>
                  <p className="muted text-sm">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
