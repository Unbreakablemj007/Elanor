/** Money and number helpers shared by server and client code. */

const usdFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** `$1,234.50` (negative: `-$1,234.50`). */
export function formatUsd(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  const s = usdFormatter.format(Math.abs(v));
  return `${v < 0 ? "-" : ""}$${s}`;
}

/** `LBP 1,234,000`. */
export function formatLbp(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${v < 0 ? "-" : ""}LBP ${intFormatter.format(Math.abs(Math.round(v)))}`;
}

export function formatInt(value: number): string {
  return intFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Round to cents, avoiding binary float noise. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Round an LBP amount to the nearest multiple of `rounding` (e.g. 5,000). */
export function roundLbp(value: number, rounding: number): number {
  const step = rounding > 0 ? rounding : 1;
  return Math.round(value / step) * step;
}

export function usdToLbp(usd: number, rate: number, rounding: number): number {
  return roundLbp(usd * rate, rounding);
}

/** Parse user-typed numbers like "1,250.5" safely; returns 0 for blanks/garbage. */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[,\s$]/g, "").replace(/^LBP/i, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
