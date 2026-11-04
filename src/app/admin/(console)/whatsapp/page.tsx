import Link from "next/link";
import { Headphones } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { WhatsAppReplyForm } from "@/components/admin/forms";
import { resolveHandoff } from "@/app/admin/actions";
import { formatDate, timeAgo } from "@/lib/format";
import { isWhatsAppConfigured } from "@/lib/whatsapp/client";

export const metadata = { title: "WhatsApp" };

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const staff = await requireStaff("whatsapp.view");
  const { c } = await searchParams;
  const db = createAdminClient();
  const { data: convs } = await db.from("whatsapp_conversations").select("*, users!whatsapp_conversations_user_id_fkey(full_name)")
    .order("handoff", { ascending: false }).order("last_message_at", { ascending: false }).limit(100);
  const active = (convs ?? []).find((x) => x.id === c) ?? convs?.[0];
  const { data: messages } = active
    ? await db.from("whatsapp_messages").select("*").eq("conversation_id", active.id).order("created_at").limit(300)
    : { data: [] };
  const windowOpen = !!active?.last_inbound_at && Date.now() - new Date(active.last_inbound_at).getTime() < 24 * 3600_000;

  return (
    <>
      <PageHeader title="WhatsApp conversations" description={isWhatsAppConfigured() ? "Bot and agent conversations. Hand-off requests appear first." : "WhatsApp API is not configured. Set WHATSAPP_* environment variables to go live."} />
      {!convs?.length ? <EmptyState title="No conversations yet" /> : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <ul className="card max-h-[70vh] divide-y divide-slate-100 overflow-y-auto p-0 dark:divide-white/5">
            {convs.map((x) => (
              <li key={x.id}>
                <Link href={`/admin/whatsapp?c=${x.id}`} className={`block px-4 py-3 ${x.id === active?.id ? "bg-lime-400/15" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{(x.users as { full_name: string } | null)?.full_name ?? x.profile_name ?? `+${x.wa_id}`}</p>
                    {x.handoff && <Pill tone="red"><Headphones className="h-3 w-3" /> Human</Pill>}
                  </div>
                  <p className="text-xs text-slate-500">+{x.wa_id} · {timeAgo(x.last_message_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
          {active && (
            <section className="card flex max-h-[70vh] flex-col p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-white/10">
                <div>
                  <p className="font-semibold">+{active.wa_id}</p>
                  <p className="text-xs text-slate-500">State: {active.state}{active.handoff && ` · hand-off requested ${formatDate(active.handoff_requested_at, true)}`}</p>
                </div>
                {active.handoff && can(staff.profile.role, "whatsapp.reply") && (
                  <form action={resolveHandoff}><input type="hidden" name="conversation_id" value={active.id} /><button className="btn btn-outline btn-sm">Resolve & return to bot</button></form>
                )}
              </div>
              <ul className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
                {(messages ?? []).map((m) => (
                  <li key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.direction === "outbound" ? (m.sent_by ? "bg-brand-900 text-white" : "bg-emerald-100 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-50") : "bg-slate-100 dark:bg-white/10"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-60">{m.direction === "outbound" ? (m.sent_by ? "Agent" : "Bot") : "Customer"} · {formatDate(m.created_at, true)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {can(staff.profile.role, "whatsapp.reply") && <div className="border-t border-slate-100 p-4 dark:border-white/10"><WhatsAppReplyForm conversationId={active.id} windowOpen={windowOpen} /></div>}
            </section>
          )}
        </div>
      )}
    </>
  );
}
