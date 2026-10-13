/** Pure reporting helpers (net of returns) shared by dashboard, sales and customers. */
import { round2 } from "./format";

type SaleLike = { subtotal_usd: number; total_usd: number };
type ItemLike = { qty: number; returned_qty: number; unit_price_usd: number; unit_cost_usd: number };

/** Share of the sale total that a set of items represents (applies the sale discount proportionally). */
export function refundValue(sale: SaleLike, lines: { qty: number; unit_price_usd: number }[]): number {
  if (sale.subtotal_usd <= 0) return 0;
  const gross = lines.reduce((s, l) => s + l.unit_price_usd * l.qty, 0);
  return round2((gross * sale.total_usd) / sale.subtotal_usd);
}

/** Revenue and cost of a sale after returns. */
export function saleNet(sale: SaleLike, items: ItemLike[]): { revenue: number; cost: number } {
  const returned = refundValue(
    sale,
    items.map((i) => ({ qty: Math.min(i.returned_qty, i.qty), unit_price_usd: i.unit_price_usd })),
  );
  const cost = items.reduce((s, i) => s + i.unit_cost_usd * Math.max(0, i.qty - i.returned_qty), 0);
  return { revenue: round2(Math.max(0, sale.total_usd - returned)), cost: round2(cost) };
}

export function groupBy<T, K>(list: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of list) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function statusTone(status: string): "danger" | "warning" | "success" {
  return status === "returned" ? "danger" : status === "partially_returned" ? "warning" : "success";
}
