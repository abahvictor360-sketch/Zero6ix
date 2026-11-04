import type { FeeSettings, ShippingRate } from "./types";

export interface QuoteInput {
  amount: number; // foreign amount
  currency: string;
  sellRate: number; // NGN per 1 unit of `currency`
  fees: Pick<FeeSettings, "percentage_fee" | "flat_fee_ngn" | "minimum_fee_ngn">;
  shipping?: { weightKg: number; rate: Pick<ShippingRate, "label" | "rate_per_kg_usd" | "min_charge_usd">; usdSellRate: number } | null;
  otherFeesNgn?: number;
}

export interface QuoteBreakdown {
  foreignAmount: number;
  currency: string;
  exchangeRate: number;
  subtotalNgn: number;
  serviceFeeNgn: number;
  shippingFeeNgn: number;
  otherFeesNgn: number;
  totalNgn: number;
  serviceFeeRule: string;
  shippingRule: string | null;
}

/** Round to 2 decimal places (kobo). */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateServiceFee(subtotalNgn: number, fees: QuoteInput["fees"]) {
  const pct = (subtotalNgn * Number(fees.percentage_fee)) / 100;
  const raw = pct + Number(fees.flat_fee_ngn);
  const min = Number(fees.minimum_fee_ngn);
  return { fee: round2(Math.max(raw, min)), appliedMinimum: raw < min };
}

export function calculateShippingUsd(
  weightKg: number,
  rate: Pick<ShippingRate, "rate_per_kg_usd" | "min_charge_usd">,
) {
  if (!(weightKg > 0)) return 0;
  // Bill per started half-kilogram, as couriers do.
  const billable = Math.ceil(weightKg * 2) / 2;
  return round2(Math.max(billable * Number(rate.rate_per_kg_usd), Number(rate.min_charge_usd)));
}

export function computeQuote(input: QuoteInput): QuoteBreakdown {
  if (!(input.amount > 0)) throw new Error("Amount must be greater than zero");
  if (!(input.sellRate > 0)) throw new Error(`No exchange rate for ${input.currency}`);

  const subtotalNgn = round2(input.amount * input.sellRate);
  const { fee: serviceFeeNgn, appliedMinimum } = calculateServiceFee(subtotalNgn, input.fees);

  let shippingFeeNgn = 0;
  let shippingRule: string | null = null;
  if (input.shipping && input.shipping.weightKg > 0) {
    const usd = calculateShippingUsd(input.shipping.weightKg, input.shipping.rate);
    shippingFeeNgn = round2(usd * input.shipping.usdSellRate);
    shippingRule = `${input.shipping.rate.label}: ${input.shipping.weightKg}kg → $${usd.toFixed(2)}`;
  }

  const otherFeesNgn = round2(input.otherFeesNgn ?? 0);
  const totalNgn = round2(subtotalNgn + serviceFeeNgn + shippingFeeNgn + otherFeesNgn);

  return {
    foreignAmount: round2(input.amount),
    currency: input.currency,
    exchangeRate: input.sellRate,
    subtotalNgn,
    serviceFeeNgn,
    shippingFeeNgn,
    otherFeesNgn,
    totalNgn,
    serviceFeeRule: appliedMinimum
      ? "Minimum fee applied"
      : `${input.fees.percentage_fee}% + ₦${Number(input.fees.flat_fee_ngn).toLocaleString("en-NG")}`,
    shippingRule,
  };
}

/** Sell rate with markup applied to a market (API) rate. */
export function applyMarkup(marketRate: number, markupPercent: number) {
  return Math.round(marketRate * (1 + markupPercent / 100) * 10000) / 10000;
}
