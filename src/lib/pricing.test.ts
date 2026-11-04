import { describe, expect, it } from "vitest";
import { applyMarkup, calculateServiceFee, calculateShippingUsd, computeQuote } from "./pricing";

const fees = { percentage_fee: 5, flat_fee_ngn: 1000, minimum_fee_ngn: 2500 };
const usShip = { label: "US → Lagos", rate_per_kg_usd: 12.5, min_charge_usd: 25 };

describe("pricing", () => {
  it("applies percentage + flat fee", () => {
    expect(calculateServiceFee(100_000, fees)).toEqual({ fee: 6000, appliedMinimum: false });
  });
  it("applies the minimum fee for small orders", () => {
    expect(calculateServiceFee(10_000, fees)).toEqual({ fee: 2500, appliedMinimum: true });
  });
  it("bills shipping per started half-kilo with a minimum charge", () => {
    expect(calculateShippingUsd(0.3, usShip)).toBe(25);
    expect(calculateShippingUsd(3.2, usShip)).toBe(43.75); // 3.5kg × 12.5
    expect(calculateShippingUsd(0, usShip)).toBe(0);
  });
  it("computes a full quote", () => {
    const q = computeQuote({ amount: 119.99, currency: "USD", sellRate: 1590, fees });
    expect(q.subtotalNgn).toBe(190784.1);
    expect(q.serviceFeeNgn).toBe(10539.21);
    expect(q.totalNgn).toBe(201323.31);
  });
  it("includes shipping converted at the USD rate", () => {
    const q = computeQuote({
      amount: 100, currency: "GBP", sellRate: 2000, fees,
      shipping: { weightKg: 2, rate: usShip, usdSellRate: 1600 },
    });
    expect(q.shippingFeeNgn).toBe(40000);
    expect(q.totalNgn).toBe(200000 + 11000 + 40000);
  });
  it("rejects invalid input", () => {
    expect(() => computeQuote({ amount: 0, currency: "USD", sellRate: 1590, fees })).toThrow();
    expect(() => computeQuote({ amount: 10, currency: "XYZ", sellRate: 0, fees })).toThrow();
  });
  it("applies markup", () => {
    expect(applyMarkup(1500, 3)).toBe(1545);
  });
});
