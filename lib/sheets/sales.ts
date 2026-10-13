import { appendRows, invalidate, num, readRecords, str, updateRowById, type SheetRecord } from "./client";

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

const TAB = "Sales" as const;

function toStatus(value: string): SaleStatus {
  return value === "returned" || value === "partially_returned" ? value : "completed";
}

function toSale({ data }: SheetRecord): Sale {
  return {
    sale_id: str(data.sale_id),
    date: str(data.date),
    customer_id: str(data.customer_id),
    subtotal_usd: num(data.subtotal_usd),
    discount_usd: num(data.discount_usd),
    total_usd: num(data.total_usd),
    exchange_rate: num(data.exchange_rate),
    total_lbp: num(data.total_lbp),
    paid_usd: num(data.paid_usd),
    paid_lbp: num(data.paid_lbp),
    change_usd: num(data.change_usd),
    change_lbp: num(data.change_lbp),
    payment_method: str(data.payment_method) || "cash",
    status: toStatus(str(data.status)),
    created_by: str(data.created_by),
    notes: str(data.notes),
  };
}

export async function listSales(opts: { fresh?: boolean } = {}): Promise<Sale[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toSale).filter((s) => s.sale_id);
}

export async function getSale(id: string, opts: { fresh?: boolean } = {}): Promise<Sale | null> {
  return (await listSales(opts)).find((s) => s.sale_id === id) ?? null;
}

export async function appendSale(sale: Sale): Promise<void> {
  await appendRows(TAB, [sale]);
  invalidate(TAB);
}

export async function updateSaleStatus(id: string, status: SaleStatus): Promise<void> {
  await updateRowById(TAB, id, { status });
  invalidate(TAB);
}
