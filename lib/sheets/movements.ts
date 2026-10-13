import { appendRows, invalidate, num, readRecords, str, type SheetRecord } from "./client";

export type MovementType = "restock" | "sale" | "return" | "adjustment";

export type Movement = {
  movement_id: string;
  date: string;
  variant_id: string;
  type: MovementType;
  qty_change: number;
  reference_id: string;
  created_by: string;
  notes: string;
};

const TAB = "Stock_Movements" as const;

function toMovement({ data }: SheetRecord): Movement {
  return {
    movement_id: str(data.movement_id),
    date: str(data.date),
    variant_id: str(data.variant_id),
    type: str(data.type) as MovementType,
    qty_change: num(data.qty_change),
    reference_id: str(data.reference_id),
    created_by: str(data.created_by),
    notes: str(data.notes),
  };
}

export async function listMovements(opts: { fresh?: boolean } = {}): Promise<Movement[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toMovement).filter((m) => m.movement_id);
}

export async function appendMovements(movements: Movement[]): Promise<void> {
  await appendRows(TAB, movements);
  invalidate(TAB);
}
