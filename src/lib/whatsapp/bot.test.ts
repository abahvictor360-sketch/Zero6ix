import { describe, expect, it, vi } from "vitest";
import { handleMessage, parseAmount, type BotContext, type BotState } from "./bot";
import { matchKeywords } from "../compliance";
import { isWithinBusinessHours } from "../business-hours";

const supported = ["USD", "GBP", "EUR", "CAD"];

function ctx(overrides: Partial<BotContext> = {}): BotContext {
  return {
    profileName: "Ada",
    siteUrl: "https://webpurchase.ng",
    rates: [{ currency: "USD", sell_rate: 1600 }, { currency: "GBP", sell_rate: 2000 }, { currency: "EUR", sell_rate: 1800 }, { currency: "CAD", sell_rate: 1100 }],
    fees: { percentage_fee: 5, flat_fee_ngn: 1000, minimum_fee_ngn: 2500 },
    isBusinessHours: true,
    hoursText: "Mon–Fri 09:00–18:00",
    lookupOrder: vi.fn(async (ref: string) => (ref === "WP-100002" ? { reference: ref, title: "IELTS fee", status: "quote_sent" as const, updated_at: "" } : null)),
    createDraft: vi.fn(async () => ({ reference: "WP-100200" })),
    requestHandoff: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function run(messages: string[], c = ctx()) {
  let state: BotState = { state: "menu", data: {} };
  let last: string[] = [];
  for (const m of messages) {
    const r = await handleMessage(state, m, c);
    state = r.next;
    last = r.replies;
  }
  return { state, last, c };
}

describe("parseAmount", () => {
  it.each([
    ["50 USD", 50, "USD"], ["usd 49.99", 49.99, "USD"], ["$1,200", 1200, "USD"],
    ["£20", 20, "GBP"], ["120 euros", 120, "EUR"], ["75", 75, "USD"], ["300 cad", 300, "CAD"],
  ])("parses %s", (input, amount, currency) => {
    expect(parseAmount(input, supported)).toEqual({ amount, currency });
  });
  it("rejects garbage and unsupported currencies", () => {
    expect(parseAmount("hello", supported)).toBeNull();
    expect(parseAmount("50 JPY", supported)).toBeNull();
    expect(parseAmount("0 USD", supported)).toBeNull();
  });
});

describe("whatsapp bot", () => {
  it("greets with the menu", async () => {
    const { last } = await run(["hi"]);
    expect(last[0]).toContain("Make a request");
    expect(last[0]).toContain("Talk to a human");
  });

  it("collects a request and creates a draft after legal confirmation", async () => {
    const c = ctx();
    const { last, state } = await run(["1", "1", "Canva Pro", "https://canva.com/pro", "119.99 usd", "annual plan", "YES"], c);
    expect(c.createDraft).toHaveBeenCalledWith({ type: "service", name: "Canva Pro", url: "https://canva.com/pro", amount: 119.99, currency: "USD", notes: "annual plan" });
    expect(last[0]).toContain("WP-100200");
    expect(state.state).toBe("menu");
  });

  it("does not create a draft without legal confirmation", async () => {
    const c = ctx();
    const { last } = await run(["1", "2", "Laptop", "skip", "500 USD", "skip", "no"], c);
    expect(c.createDraft).not.toHaveBeenCalled();
    expect(last[0]).toContain("cancelled");
  });

  it("explains when a draft is refused", async () => {
    const c = ctx({ createDraft: vi.fn(async () => { throw new Error("This request appears to involve prohibited items"); }) });
    const { last, state } = await run(["1", "2", "Pistol", "skip", "300 USD", "skip", "yes"], c);
    expect(last[0]).toContain("prohibited");
    expect(state.state).toBe("menu");
  });

  it("looks up order status", async () => {
    const { last } = await run(["2", "wp-100002"]);
    expect(last[0]).toContain("Quote Sent");
    const miss = await run(["2", "WP-999999"]);
    expect(miss.last[0]).toContain("couldn't find");
  });

  it("gives a fee estimate", async () => {
    const { last } = await run(["3", "100 USD"]);
    // 160,000 + max(2,500, 8,000 + 1,000) = 169,000
    expect(last[0]).toContain("169,000.00");
  });

  it("hands off to a human and stays quiet until 'menu'", async () => {
    const c = ctx({ isBusinessHours: false });
    const r = await run(["5"], c);
    expect(c.requestHandoff).toHaveBeenCalled();
    expect(r.last[0]).toContain("offline");
    const quiet = await handleMessage(r.state, "my order is late", c);
    expect(quiet.replies).toEqual([]);
    const back = await handleMessage(r.state, "menu", c);
    expect(back.next.state).toBe("menu");
  });
});

describe("compliance keyword matching", () => {
  const kws = [{ keyword: "gun", severity: "block" as const }, { keyword: "gift card", severity: "flag" as const }];
  it("matches whole words only", () => {
    expect(matchKeywords("Buy a GUN please", kws)).toHaveLength(1);
    expect(matchKeywords("I begun shopping", kws)).toHaveLength(0);
    expect(matchKeywords("Amazon gift card $50", kws)[0].keyword).toBe("gift card");
  });
});

describe("business hours", () => {
  const hours = { timezone: "Africa/Lagos", days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00", saturday_end: "14:00" };
  it("respects Lagos time and Saturday hours", () => {
    expect(isWithinBusinessHours(hours, new Date("2026-11-04T10:00:00Z"))).toBe(true);  // Wed 11:00 WAT
    expect(isWithinBusinessHours(hours, new Date("2026-11-04T18:30:00Z"))).toBe(false); // Wed 19:30 WAT
    expect(isWithinBusinessHours(hours, new Date("2026-11-07T14:00:00Z"))).toBe(false); // Sat 15:00 WAT
    expect(isWithinBusinessHours(hours, new Date("2026-11-08T10:00:00Z"))).toBe(false); // Sunday
  });
});
