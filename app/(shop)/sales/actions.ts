"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { nowIso } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { redirect } from "next/navigation";
import { applyReturn, deleteSaleRecord, getSale, listItemsForSale, listVariants, type Movement } from "@/lib/db";
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
      getSale(sale_id),
      listItemsForSale(sale_id),
      listVariants(),
    ]);
  } catch (err) {
    return failFromError(err);
  }
  if (!sale) return fail(t.common.notFound);

  const now = nowIso();
  const movements: Movement[] = [];
  for (const { line_id, qty } of lines) {
    const item = items.find((i) => i.line_id === line_id);
    if (!item) return fail(`${t.common.notFound} (${line_id})`);
    const returnable = item.qty - item.returned_qty;
    if (qty > returnable) return fail(t.sales.returnTooMany(item.product_name, returnable));
    const variant = variants.find((v) => v.variant_id === item.variant_id);
    if (!variant) return fail(`${t.common.notFound} (${item.variant_id})`);
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

  // One database call: returned quantities, stock and the sale status are
  // updated together, or nothing changes.
  try {
    await applyReturn(sale_id, lines, movements);
  } catch (err) {
    return failFromError(err);
  }
  return ok(null);
}

/** Delete a sale (unreturned pieces go back to stock first), then go to the sales list. */
export async function deleteSale(sale_id: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const id = z.string().min(1).max(40).safeParse(sale_id);
  if (!id.success) return fail(zodMessage(id.error));

  try {
    const [sale, items] = await Promise.all([getSale(id.data), listItemsForSale(id.data)]);
    if (!sale) return fail(t.common.notFound);
    const now = nowIso();
    const remaining = items
      .filter((i) => i.qty > i.returned_qty)
      .map((i) => ({ line_id: i.line_id, qty: i.qty - i.returned_qty, variant_id: i.variant_id }));
    const movements: Movement[] = remaining.map((r) => ({
      movement_id: newId("M"),
      date: now,
      variant_id: r.variant_id,
      type: "return",
      qty_change: r.qty,
      reference_id: id.data,
      created_by: user,
      notes: t.sales.deletedNote,
    }));
    await deleteSaleRecord(
      id.data,
      remaining.map(({ line_id, qty }) => ({ line_id, qty })),
      movements,
    );
  } catch (err) {
    return failFromError(err);
  }
  redirect("/sales");
}
