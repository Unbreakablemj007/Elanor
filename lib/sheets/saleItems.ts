import { appendRows, invalidate, num, readRecords, str, updateRows, type SheetRecord } from "./client";

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
  rowNumber: number;
};

const TAB = "Sale_Items" as const;

function toItem({ data, rowNumber }: SheetRecord): SaleItem {
  return {
    line_id: str(data.line_id),
    sale_id: str(data.sale_id),
    variant_id: str(data.variant_id),
    product_id: str(data.product_id),
    product_name: str(data.product_name),
    size: str(data.size),
    color: str(data.color),
    qty: num(data.qty),
    unit_price_usd: num(data.unit_price_usd),
    unit_cost_usd: num(data.unit_cost_usd),
    line_total_usd: num(data.line_total_usd),
    returned_qty: num(data.returned_qty),
    rowNumber,
  };
}

export async function listSaleItems(opts: { fresh?: boolean } = {}): Promise<SaleItem[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toItem).filter((i) => i.line_id);
}

export async function listItemsForSale(saleId: string, opts: { fresh?: boolean } = {}): Promise<SaleItem[]> {
  return (await listSaleItems(opts)).filter((i) => i.sale_id === saleId);
}

export async function appendSaleItems(items: Omit<SaleItem, "rowNumber">[]): Promise<void> {
  await appendRows(TAB, items);
  invalidate(TAB);
}

/** Items must come from a fresh read so their row numbers are current. */
export async function updateReturnedQty(updates: { item: SaleItem; returned_qty: number }[]): Promise<void> {
  await updateRows(
    TAB,
    updates.map(({ item, returned_qty }) => ({ rowNumber: item.rowNumber, patch: { returned_qty } })),
  );
  invalidate(TAB);
}
