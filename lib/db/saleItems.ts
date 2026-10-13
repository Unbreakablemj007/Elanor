import { check, db, num, selectAll, str } from "./client";

export type SaleItem = {
  line_id: string;
  sale_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  size: string;
  color: string;
  qty: number;
  unit_price_usd: number;
  unit_cost_usd: number;
  line_total_usd: number;
  returned_qty: number;
};

function toItem(r: Record<string, unknown>): SaleItem {
  return {
    line_id: str(r.line_id),
    sale_id: str(r.sale_id),
    variant_id: str(r.variant_id),
    product_id: str(r.product_id),
    product_name: str(r.product_name),
    size: str(r.size),
    color: str(r.color),
    qty: num(r.qty),
    unit_price_usd: num(r.unit_price_usd),
    unit_cost_usd: num(r.unit_cost_usd),
    line_total_usd: num(r.line_total_usd),
    returned_qty: num(r.returned_qty),
  };
}

export async function listSaleItems(): Promise<SaleItem[]> {
  return (await selectAll<Record<string, unknown>>("sale_items", "line_id")).map(toItem);
}

export async function listItemsForSale(saleId: string): Promise<SaleItem[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("sale_items").select("*").eq("sale_id", saleId).order("line_id");
  check(error, "read sale items");
  return (data ?? []).map(toItem);
}
