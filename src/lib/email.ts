import "server-only";
import { site } from "@/lib/site";
import { envValue } from "@/lib/env";

interface EmailInput {
  to: string | string[];
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  attachments?: { filename: string; content: Buffer }[];
  replyTo?: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmail({ heading, paragraphs, cta }: Pick<EmailInput, "heading" | "paragraphs" | "cta">) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:#0f3f2d;padding:20px 28px;color:#cdf548;font-weight:700;font-size:18px">${esc(site.name)}</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;color:#334155">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#cdf548;color:#072a1d;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#64748b">
Legal requests only. ${esc(site.name)} · ${esc(site.address)}<br/>Need help? Reply to this email or call ${esc(site.phone)}.
</td></tr></table></td></tr></table></body></html>`;
}

/** Send an email through Resend's HTTP API. No-ops (with a log) when not configured. */
export async function sendEmail(input: EmailInput): Promise<boolean> {
  const key = envValue("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? `${site.name} <onboarding@resend.dev>`;
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set: skipping "${input.subject}" to ${input.to}`);
    return false;
  }
  // RESEND_API_URL: test-only override.
  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: renderEmail(input),
      reply_to: input.replyTo ?? site.email,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
    }),
  });
  if (!res.ok) {
    console.error("[email] send failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  const { id } = (await res.json().catch(() => ({}))) as { id?: string };
  console.info(`[email] sent "${input.subject}" via Resend (id ${id ?? "?"}) from ${from}`);
  return true;
}
