import { iso, num, numOrNull, selectAll, str } from "./client";

export type Variant = {
  variant_id: string;
  product_id: string;
  size: string;
  color: string;
  quantity: number;
  /** null = use Settings.low_stock_default */
  low_stock_threshold: number | null;
  updated_at: string;
};

export type NewVariant = Variant;

function toVariant(r: Record<string, unknown>): Variant {
  return {
    variant_id: str(r.variant_id),
    product_id: str(r.product_id),
    size: str(r.size),
    color: str(r.color),
    quantity: num(r.quantity),
    low_stock_threshold: numOrNull(r.low_stock_threshold),
    updated_at: iso(r.updated_at),
  };
}

export async function listVariants(): Promise<Variant[]> {
  return (await selectAll<Record<string, unknown>>("variants", "variant_id")).map(toVariant);
}
