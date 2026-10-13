import { invalidate, iso, num, rpc, selectAll, str } from "./client";

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

function toMovement(r: Record<string, unknown>): Movement {
  return {
    movement_id: str(r.movement_id),
    date: iso(r.date),
    variant_id: str(r.variant_id),
    type: str(r.type) as MovementType,
    qty_change: num(r.qty_change),
    reference_id: str(r.reference_id),
    created_by: str(r.created_by),
    notes: str(r.notes),
  };
}

export async function listMovements(): Promise<Movement[]> {
  return (await selectAll<Record<string, unknown>>("stock_movements", "date")).map(toMovement);
}

/** Restock/adjust one size. Refuses to go below zero. Returns the new quantity. */
export async function changeStockRecord(movement: Movement): Promise<number> {
  const quantity = await rpc<number>("change_stock", { p_movement: movement });
  invalidate();
  return num(quantity);
}
