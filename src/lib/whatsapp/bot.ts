/**
 * WhatsApp chatbot — pure conversation state machine.
 * All side effects (DB lookups, draft creation, handoff) are injected via
 * BotContext so the flow is deterministic and unit-testable.
 */
import { computeQuote } from "../pricing";
import { formatMoney } from "../format";
import { STATUS_LABELS } from "../status";
import type { ExchangeRate, FeeSettings, RequestStatus } from "../types";

export type BotStateName =
  | "menu"
  | "req_type"
  | "req_name"
  | "req_url"
  | "req_amount"
  | "req_notes"
  | "req_confirm"
  | "status_ref"
  | "estimate"
  | "human";

export interface BotState {
  state: BotStateName;
  data: Record<string, string | number | undefined>;
}

export interface OrderSummary {
  reference: string;
  title: string;
  status: RequestStatus;
  updated_at: string;
  tracking?: string | null;
}

export interface DraftInput {
  type: "service" | "item";
  name: string;
  url?: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface BotContext {
  profileName: string;
  siteUrl: string;
  rates: Pick<ExchangeRate, "currency" | "sell_rate">[];
  fees: Pick<FeeSettings, "percentage_fee" | "flat_fee_ngn" | "minimum_fee_ngn">;
  isBusinessHours: boolean;
  hoursText: string;
  /** Returns the order only if it belongs to this WhatsApp number. */
  lookupOrder: (reference: string) => Promise<OrderSummary | null>;
  createDraft: (draft: DraftInput) => Promise<{ reference: string }>;
  requestHandoff: () => Promise<void>;
}

export interface BotResult {
  replies: string[];
  next: BotState;
  handoff?: boolean;
}

const MENU = (name: string) =>
  [
    `Hello${name ? ` ${name}` : ""} 👋 Welcome to *Web Purchase* — we pay for anything online, in any currency. Legal requests only.`,
    "",
    "Reply with a number:",
    "1️⃣ Make a request",
    "2️⃣ Check order status",
    "3️⃣ Get a quote estimate",
    "4️⃣ See prohibited items",
    "5️⃣ Talk to a human",
    "",
    "Type *menu* any time to start over.",
  ].join("\n");

const PROHIBITED =
  "🚫 *We can't help with:*\n• Weapons, ammunition, explosives\n• Drugs & prescription-only medicines\n• Counterfeit/replica goods, pirated software\n• Gambling, betting, casino deposits\n• Adult content\n• Hazardous materials (fireworks, loose lithium batteries, chemicals)\n• Items banned by Nigerian Customs\n• Anything that breaks the vendor's terms\n\nFull list: ";

const SYMBOLS: Record<string, string> = { $: "USD", "£": "GBP", "€": "EUR", "¥": "CNY" };
const ALIASES: Record<string, string> = { DOLLAR: "USD", DOLLARS: "USD", POUNDS: "GBP", POUND: "GBP", EURO: "EUR", EUROS: "EUR", YUAN: "CNY", DIRHAM: "AED" };

/** Parse "50 USD", "USD 50", "$49.99", "£20", "1,200 cad". Defaults to USD. */
export function parseAmount(input: string, supported: string[]): { amount: number; currency: string } | null {
  const text = input.trim().toUpperCase().replace(/,/g, "");
  const num = text.match(/\d+(\.\d{1,2})?/);
  if (!num) return null;
  const amount = Number(num[0]);
  if (!(amount > 0) || amount > 1_000_000) return null;
  let currency = "USD";
  const sym = Object.keys(SYMBOLS).find((s) => text.includes(s));
  if (sym) currency = SYMBOLS[sym];
  const words = text.match(/[A-Z]{3,}/g) ?? [];
  const word = words.find((w) => supported.includes(w) || ALIASES[w]);
  if (word) currency = ALIASES[word] ?? word;
  else if (words.some((w) => w.length === 3)) return null; // explicit but unsupported code, e.g. "JPY"
  if (!supported.includes(currency)) return null;
  return { amount, currency };
}

const isGreeting = (t: string) => /^(hi|hello|hey|good (morning|afternoon|evening)|start|menu|0|restart|back)\b/i.test(t);
const yes = (t: string) => /^(y|yes|yeah|yep|ok|okay|confirm|i confirm)\b/i.test(t);
const no = (t: string) => /^(n|no|nope|cancel)\b/i.test(t);
const fresh = (state: BotStateName = "menu", data: BotState["data"] = {}): BotState => ({ state, data });

export async function handleMessage(current: BotState, rawText: string, ctx: BotContext): Promise<BotResult> {
  const text = rawText.trim();
  const supported = ctx.rates.map((r) => r.currency);

  // While handed off to a human the bot stays silent unless asked to resume.
  if (current.state === "human") {
    if (/^(menu|bot)$/i.test(text)) return { replies: [MENU(ctx.profileName)], next: fresh() };
    return { replies: [], next: current };
  }

  if (isGreeting(text) || !text) {
    return { replies: [MENU(ctx.profileName)], next: fresh() };
  }

  switch (current.state) {
    case "menu": {
      const choice = text.replace(/[^\d]/g, "").slice(0, 1) || text.toLowerCase();
      if (choice === "1" || /request|pay|buy/i.test(text))
        return { replies: ["Great! What would you like?\n\n1️⃣ Pay for a *service* (subscription, exam fee, visa fee…)\n2️⃣ Buy an *item* to be shipped to Nigeria"], next: fresh("req_type") };
      if (choice === "2" || /status|track|order/i.test(text))
        return { replies: ["Please send your order ID (e.g. *WP-100123*)."], next: fresh("status_ref") };
      if (choice === "3" || /quote|estimate|price|rate/i.test(text))
        return { replies: [`Send the amount and currency, e.g. *50 USD* or *£120*.\nSupported: ${supported.join(", ")}`], next: fresh("estimate") };
      if (choice === "4" || /prohibit|banned|allowed/i.test(text))
        return { replies: [PROHIBITED + `${ctx.siteUrl}/legal/prohibited-items`, "Reply *menu* to go back."], next: fresh() };
      if (choice === "5" || /human|agent|person|support|help/i.test(text)) return handoff(ctx);
      return { replies: ["Sorry, I didn't get that. " + MENU(ctx.profileName)], next: fresh() };
    }

    case "req_type": {
      const type = /^1|service/i.test(text) ? "service" : /^2|item|buy/i.test(text) ? "item" : null;
      if (!type) return { replies: ["Please reply *1* for a service or *2* for an item."], next: current };
      return {
        replies: [type === "service" ? "What service should we pay for? (e.g. *Canva Pro*, *IELTS fee*, *WES evaluation*)" : "What item do you want to buy? (e.g. *iPhone 15 case*)"],
        next: fresh("req_name", { type }),
      };
    }

    case "req_name":
      if (text.length < 2) return { replies: ["Please type a short name for the service or item."], next: current };
      return { replies: ["Please paste the website or product link (or type *skip*)."], next: fresh("req_url", { ...current.data, name: text.slice(0, 160) }) };

    case "req_url": {
      const url = /^skip$/i.test(text) ? undefined : text.match(/https?:\/\/\S+/i)?.[0];
      if (!url && !/^skip$/i.test(text)) return { replies: ["That doesn't look like a link. Paste a link starting with http(s):// or type *skip*."], next: current };
      return { replies: ["How much does it cost and in what currency? e.g. *49.99 USD*"], next: fresh("req_amount", { ...current.data, url }) };
    }

    case "req_amount": {
      const parsed = parseAmount(text, supported);
      if (!parsed) return { replies: [`Please send an amount with currency, e.g. *49.99 USD*. Supported: ${supported.join(", ")}`], next: current };
      return { replies: ["Any notes for our team? (plan, size/colour, deadline…) or type *skip*."], next: fresh("req_notes", { ...current.data, ...parsed }) };
    }

    case "req_notes": {
      const notes = /^skip$/i.test(text) ? undefined : text.slice(0, 1000);
      const d: BotState["data"] = { ...current.data, notes };
      const summary = [
        "*Please confirm your request:*",
        `• Type: ${d.type}`,
        `• ${d.type === "service" ? "Service" : "Item"}: ${d.name}`,
        d.url ? `• Link: ${d.url}` : null,
        `• Amount: ${d.currency} ${d.amount}`,
        notes ? `• Notes: ${notes}` : null,
        "",
        "⚖️ Reply *YES* to confirm this request is legal and complies with Web Purchase's Terms of Service, or *NO* to cancel.",
      ].filter((l) => l !== null);
      return { replies: [summary.join("\n")], next: fresh("req_confirm", d) };
    }

    case "req_confirm": {
      if (no(text)) return { replies: ["Request cancelled. Reply *menu* to start again."], next: fresh() };
      if (!yes(text)) return { replies: ["Please reply *YES* to confirm or *NO* to cancel."], next: current };
      const d = current.data;
      let draft: { reference: string };
      try {
        draft = await ctx.createDraft({
        type: d.type as "service" | "item",
        name: String(d.name),
        url: d.url ? String(d.url) : undefined,
        amount: Number(d.amount),
        currency: String(d.currency),
        notes: d.notes ? String(d.notes) : undefined,
        });
      } catch (e) {
        return { replies: [`⚠️ ${e instanceof Error ? e.message : "We couldn't create that request."}\n\nReply *menu* to start again or *5* to talk to a human.`], next: fresh() };
      }
      return {
        replies: [
          `✅ Draft request *${draft.reference}* created!\n\nOur team will review it and send you a quote in Naira. To track it and pay securely, sign in or create an account with this WhatsApp number at ${ctx.siteUrl}/signup\n\nReply *menu* for more options.`,
        ],
        next: fresh(),
      };
    }

    case "status_ref": {
      const ref = text.toUpperCase().match(/WP-?\d{6,}/)?.[0]?.replace(/^WP-?/, "WP-");
      if (!ref) return { replies: ["Order IDs look like *WP-100123*. Please try again or type *menu*."], next: current };
      const order = await ctx.lookupOrder(ref);
      if (!order)
        return {
          replies: [`I couldn't find *${ref}* for this WhatsApp number. You can also check at ${ctx.siteUrl}/track?ref=${ref}\n\nReply *menu* to go back.`],
          next: fresh(),
        };
      return {
        replies: [
          `📦 *${order.reference}* — ${order.title}\nStatus: *${STATUS_LABELS[order.status]}*${order.tracking ? `\nTracking: ${order.tracking}` : ""}\n\nDetails: ${ctx.siteUrl}/track?ref=${order.reference}\n\nReply *menu* for more options.`,
        ],
        next: fresh(),
      };
    }

    case "estimate": {
      const parsed = parseAmount(text, supported);
      if (!parsed) return { replies: [`Please send an amount with currency, e.g. *50 USD*. Supported: ${supported.join(", ")}`], next: current };
      const rate = ctx.rates.find((r) => r.currency === parsed.currency)!;
      const q = computeQuote({ amount: parsed.amount, currency: parsed.currency, sellRate: Number(rate.sell_rate), fees: ctx.fees });
      return {
        replies: [
          [
            `💱 *Estimate for ${parsed.currency} ${parsed.amount}*`,
            `Rate: ₦${Number(rate.sell_rate).toLocaleString("en-NG")} / ${parsed.currency}`,
            `Amount: ${formatMoney(q.subtotalNgn)}`,
            `Service fee: ${formatMoney(q.serviceFeeNgn)}`,
            `*Estimated total: ${formatMoney(q.totalNgn)}*`,
            "",
            "Estimates exclude shipping. Your final quote locks the rate for 24 hours.",
            "Reply *1* to make a request or *menu* to go back.",
          ].join("\n"),
        ],
        next: fresh(),
      };
    }

    default:
      return { replies: [MENU(ctx.profileName)], next: fresh() };
  }
}

async function handoff(ctx: BotContext): Promise<BotResult> {
  await ctx.requestHandoff();
  return {
    replies: [
      ctx.isBusinessHours
        ? "👩🏽‍💼 Connecting you to a team member now. Please describe how we can help — an agent will reply shortly.\n\n(Type *menu* to return to the bot.)"
        : `Our team is offline right now (hours: ${ctx.hoursText}). Leave your message here and an agent will reply first thing when we're back.\n\n(Type *menu* to return to the bot.)`,
    ],
    next: fresh("human"),
    handoff: true,
  };
}
