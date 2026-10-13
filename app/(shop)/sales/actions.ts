"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { nowIso } from "@/lib/dates";
import { newId } from "@/lib/ids";
import {
  appendMovements,
  getSale,
  listItemsForSale,
  listVariants,
  updateReturnedQty,
  updateSaleStatus,
  updateVariants,
  type Movement,
  type SaleItem,
} from "@/lib/sheets";
import { t } from "@/lib/strings";

const returnSchema = z.object({
  sale_id: z.string().min(1).max(40),
  lines: z
    .array(z.object({ line_id: z.string().min(1).max(40), qty: z.number().int().min(1).max(1000) }))
    .min(1, t.sales.returnNothing)
    .max(200)
    .refine((ls) => new Set(ls.map((l) => l.line_id)).size === ls.length, "Each line may appear only once"),
});

export async function returnItems(input: z.infer<typeof returnSchema>): Promise<ActionResult<null>> {
  const user = await requireUser();
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const { sale_id, lines } = parsed.data;

  let sale, items, variants;
  try {
    [sale, items, variants] = await Promise.all([
      getSale(sale_id, { fresh: true }),
      listItemsForSale(sale_id, { fresh: true }),
      listVariants({ fresh: true }),
    ]);
  } catch (err) {
    return failFromError(err);
  }
  if (!sale) return fail(t.common.notFound);

  const now = nowIso();
  const itemUpdates: { item: SaleItem; returned_qty: number }[] = [];
  const restock = new Map<string, number>();
  const movements: Movement[] = [];
  const returnedAfter = new Map(items.map((i) => [i.line_id, i.returned_qty]));
  for (const { line_id, qty } of lines) {
    const item = items.find((i) => i.line_id === line_id);
    if (!item) return fail(`${t.common.notFound} (${line_id})`);
    const returnable = item.qty - item.returned_qty;
    if (qty > returnable) return fail(t.sales.returnTooMany(item.product_name, returnable));
    const variant = variants.find((v) => v.variant_id === item.variant_id);
    if (!variant) return fail(`${t.common.notFound} (${item.variant_id})`);
    itemUpdates.push({ item, returned_qty: item.returned_qty + qty });
    returnedAfter.set(line_id, item.returned_qty + qty);
    restock.set(variant.variant_id, (restock.get(variant.variant_id) ?? 0) + qty);
    movements.push({
      movement_id: newId("M"),
      date: now,
      variant_id: variant.variant_id,
      type: "return" as const,
      qty_change: qty,
      reference_id: sale_id,
      created_by: user,
      notes: "",
    });
  }
  const variantPatches = [...restock].map(([variant_id, qty]) => {
    const variant = variants.find((v) => v.variant_id === variant_id)!;
    return { variant, patch: { quantity: variant.quantity + qty, updated_at: now } };
  });
  const allReturned = items.every((i) => (returnedAfter.get(i.line_id) ?? 0) >= i.qty);
  const status = allReturned ? "returned" : "partially_returned";

  const steps: [string, () => Promise<void>][] = [
    ["Sale_Items (returned_qty)", () => updateReturnedQty(itemUpdates)],
    ["Variants (stock)", () => updateVariants(variantPatches)],
    ["Stock_Movements", () => appendMovements(movements)],
    ["Sales (status)", () => updateSaleStatus(sale_id, status)],
  ];
  const done: string[] = [];
  for (const [name, run] of steps) {
    try {
      await run();
      done.push(name);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[return ${sale_id}] FAILED at ${name}. Completed: ${done.join(", ") || "none"}. Reason: ${reason}`);
      if (done.length === 0) return failFromError(err);
      return fail(t.errors.partialReturn(sale_id, done, name));
    }
  }
  return ok(null);
}
