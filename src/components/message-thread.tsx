import { Paperclip } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Message } from "@/lib/types";

export function MessageThread({
  messages, viewer, attachmentNames = {},
}: { messages: Message[]; viewer: "client" | "staff"; attachmentNames?: Record<string, string> }) {
  if (!messages.length) return <p className="muted text-sm">No messages yet. Ask us anything about this request.</p>;
  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const mine = viewer === "staff" ? m.is_staff : !m.is_staff;
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.internal ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                : mine ? "bg-brand-900 text-white dark:bg-brand-700" : "bg-slate-100 dark:bg-white/10"}`}>
              <p className="mb-0.5 text-[11px] font-semibold opacity-70">
                {m.internal ? "Internal note" : m.is_staff ? "Web Purchase team" : "Client"} · {formatDate(m.created_at, true)}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              {m.attachment_id && (
                <a href={`/api/attachments/${m.attachment_id}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs underline">
                  <Paperclip className="h-3 w-3" /> {attachmentNames[m.attachment_id] ?? "Attachment"}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
