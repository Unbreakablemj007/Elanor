import { check, db, invalidate, iso, num, rpc, selectAll, str } from "./client";
import type { Movement } from "./movements";
import type { SaleItem } from "./saleItems";

export type SaleStatus = "completed" | "partially_returned" | "returned";

export type Sale = {
  sale_id: string;
  date: string;
  customer_id: string;
  subtotal_usd: number;
  discount_usd: number;
  total_usd: number;
  exchange_rate: number;
  total_lbp: number;
  paid_usd: number;
  paid_lbp: number;
  change_usd: number;
  change_lbp: number;
  payment_method: string;
  status: SaleStatus;
  created_by: string;
  notes: string;
};

function toStatus(value: string): SaleStatus {
  return value === "returned" || value === "partially_returned" ? value : "completed";
}

function toSale(r: Record<string, unknown>): Sale {
  return {
    sale_id: str(r.sale_id),
    date: iso(r.date),
    customer_id: str(r.customer_id),
    subtotal_usd: num(r.subtotal_usd),
    discount_usd: num(r.discount_usd),
    total_usd: num(r.total_usd),
    exchange_rate: num(r.exchange_rate),
    total_lbp: num(r.total_lbp),
    paid_usd: num(r.paid_usd),
    paid_lbp: num(r.paid_lbp),
    change_usd: num(r.change_usd),
    change_lbp: num(r.change_lbp),
    payment_method: str(r.payment_method) || "cash",
    status: toStatus(str(r.status)),
    created_by: str(r.created_by),
    notes: str(r.notes),
  };
}

export async function listSales(): Promise<Sale[]> {
  return (await selectAll<Record<string, unknown>>("sales", "date")).map(toSale);
}

export async function getSale(id: string): Promise<Sale | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("sales").select("*").eq("sale_id", id).maybeSingle();
  check(error, "read sale");
  return data ? toSale(data) : null;
}

/** Sale, its lines and the stock decrease, saved together (all or nothing). */
export async function recordSale(sale: Sale, items: SaleItem[], movements: Movement[]): Promise<void> {
  await rpc("record_sale", {
    p_sale: { ...sale, customer_id: sale.customer_id || null },
    p_items: items,
    p_movements: movements,
  });
  invalidate();
}

/** Mark lines as returned, put stock back and update the sale status (all or nothing). */
export async function applyReturn(
  sale_id: string,
  lines: { line_id: string; qty: number }[],
  movements: Movement[],
): Promise<SaleStatus> {
  const status = await rpc<string>("apply_return", { p_sale_id: sale_id, p_lines: lines, p_movements: movements });
  invalidate();
  return toStatus(str(status));
}
