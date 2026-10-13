/** Pure stock helpers shared by server and client components. */

export type StockVariant = {
  variant_id: string;
  product_id: string;
  size: string;
  color: string;
  quantity: number;
  low_stock_threshold: number | null;
};

export function thresholdOf(v: Pick<StockVariant, "low_stock_threshold">, lowStockDefault: number): number {
  return v.low_stock_threshold ?? lowStockDefault;
}

export function isLowStock(v: StockVariant, lowStockDefault: number): boolean {
  return v.quantity <= thresholdOf(v, lowStockDefault);
}

/** Sort comparator that follows the order of sizes in the Lists tab. */
export function bySize(sizes: string[]) {
  const rank = (s: string) => {
    const i = sizes.indexOf(s);
    return i === -1 ? sizes.length : i;
  };
  return (a: { size: string; color: string }, b: { size: string; color: string }) =>
    rank(a.size) - rank(b.size) || a.size.localeCompare(b.size) || a.color.localeCompare(b.color);
}

/** Total quantity per size, in Lists order: [["S", 3], ["M", 5]]. */
export function stockBySize(variants: StockVariant[], sizes: string[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const v of [...variants].sort(bySize(sizes))) {
    totals.set(v.size, (totals.get(v.size) ?? 0) + v.quantity);
  }
  return [...totals.entries()];
}

export function variantLabel(v: { size: string; color: string }): string {
  return [v.size, v.color].filter(Boolean).join(" / ");
}
