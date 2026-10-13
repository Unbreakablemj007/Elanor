import { round2, roundLbp } from "./format";

/**
 * Checkout maths, shared by the POS screen and the server action so both
 * always agree.
 */

export type DiscountInput = { type: "usd" | "pct"; value: number };

export function computeDiscount(subtotalUsd: number, discount: DiscountInput): number {
  const v = Math.max(0, discount.value || 0);
  const raw = discount.type === "pct" ? (subtotalUsd * Math.min(v, 100)) / 100 : v;
  return round2(Math.min(raw, subtotalUsd));
}

export type PaymentInput = {
  totalUsd: number;
  rate: number;
  rounding: number;
  paidUsd: number;
  paidLbp: number;
};

export type PaymentResult = {
  totalLbp: number;
  /** True when the money handed over covers the total. */
  sufficient: boolean;
  remainingUsd: number;
  remainingLbp: number;
  /** Change owed, expressed in USD … */
  changeUsd: number;
  /** … and its LBP equivalent (rounded). The cashier gives one of the two. */
  changeLbp: number;
};

export function computePayment({ totalUsd, rate, rounding, paidUsd, paidLbp }: PaymentInput): PaymentResult {
  const safeRate = rate > 0 ? rate : 1;
  const totalLbp = roundLbp(totalUsd * safeRate, rounding);
  const pUsd = Math.max(0, paidUsd || 0);
  const pLbp = Math.max(0, paidLbp || 0);

  if (pUsd === 0 && pLbp > 0) {
    // Paid entirely in LBP: compare against the rounded LBP total.
    const diff = pLbp - totalLbp;
    return {
      totalLbp,
      sufficient: diff >= 0,
      remainingUsd: diff < 0 ? round2(-diff / safeRate) : 0,
      remainingLbp: diff < 0 ? -diff : 0,
      changeUsd: diff > 0 ? round2(diff / safeRate) : 0,
      changeLbp: diff > 0 ? roundLbp(diff, rounding) : 0,
    };
  }

  // USD only or mixed: compare in USD. When LBP is involved, allow half a
  // rounding step of tolerance because LBP amounts are rounded.
  const diffUsd = pUsd + pLbp / safeRate - totalUsd;
  const tolerance = pLbp > 0 ? rounding / 2 / safeRate : 0.000001;
  const sufficient = diffUsd >= -tolerance;
  return {
    totalLbp,
    sufficient,
    remainingUsd: sufficient ? 0 : round2(-diffUsd),
    remainingLbp: sufficient ? 0 : roundLbp(-diffUsd * safeRate, rounding),
    changeUsd: diffUsd > 0 ? round2(diffUsd) : 0,
    changeLbp: diffUsd > 0 ? roundLbp(diffUsd * safeRate, rounding) : 0,
  };
}
