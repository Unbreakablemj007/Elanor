"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { failFromError, fail, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { nowIso } from "@/lib/dates";
import { round2 } from "@/lib/format";
import { newId } from "@/lib/ids";
import { variantLabel } from "@/lib/inventory";
import {
  appendMovements,
  appendProduct,
  appendVariants,
  getProduct,
  listVariants,
  updateProduct,
  updateVariants,
  type Movement,
  type NewVariant,
} from "@/lib/sheets";
import { t } from "@/lib/strings";

const money = z.number().finite().min(0).max(1_000_000);
const qty = z.number().int().min(0).max(100_000);

const variantSchema = z.object({
  variant_id: z.string().max(40).optional(),
  size: z.string().trim().min(1, "Size is required").max(40),
  color: z.string().trim().max(40),
  quantity: qty,
  low_stock_threshold: qty.nullable(),
});

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.string().trim().max(60),
  description: z.string().trim().max(1000),
  cost_price_usd: money,
  sell_price_usd: money,
  image_url: z.union([z.literal(""), z.string().trim().url().max(1000)]),
  variants: z.array(variantSchema).min(1, t.products.atLeastOneVariant).max(100),
});

export type ProductInput = z.infer<typeof productSchema>;

function hasDuplicates(variants: { size: string; color: string }[]): boolean {
  const keys = variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`);
  return new Set(keys).size !== keys.length;
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ product_id: string }>> {
  const user = await requireUser();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const data = parsed.data;
  if (hasDuplicates(data.variants)) return fail(t.products.duplicateVariant);

  const now = nowIso();
  const product_id = newId("P");
  const variants: NewVariant[] = data.variants.map((v) => ({
    variant_id: newId("V"),
    product_id,
    size: v.size,
    color: v.color,
    quantity: v.quantity,
    low_stock_threshold: v.low_stock_threshold,
    updated_at: now,
  }));
  const movements: Movement[] = variants
    .filter((v) => v.quantity > 0)
    .map((v) => ({
      movement_id: newId("M"),
      date: now,
      variant_id: v.variant_id,
      type: "restock",
      qty_change: v.quantity,
      reference_id: product_id,
      created_by: user,
      notes: t.products.initialStockNote,
    }));

  try {
    await appendProduct({
      product_id,
      name: data.name,
      category: data.category,
      description: data.description,
      cost_price_usd: round2(data.cost_price_usd),
      sell_price_usd: round2(data.sell_price_usd),
      image_url: data.image_url,
      active: true,
      created_at: now,
      updated_at: now,
    });
    await appendVariants(variants);
    await appendMovements(movements);
    return ok({ product_id });
  } catch (err) {
    console.error(`[products] create ${product_id} incomplete`);
    return failFromError(err);
  }
}

export async function saveProduct(
  product_id: string,
  input: ProductInput,
): Promise<ActionResult<{ product_id: string }>> {
  const user = await requireUser();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const data = parsed.data;
  if (hasDuplicates(data.variants)) return fail(t.products.duplicateVariant);

  try {
    const product = await getProduct(product_id, { fresh: true });
    if (!product) return fail(t.common.notFound);
    const now = nowIso();
    const existing = (await listVariants({ fresh: true })).filter((v) => v.product_id === product_id);

    const patches = [];
    const added: NewVariant[] = [];
    for (const v of data.variants) {
      const current = v.variant_id ? existing.find((e) => e.variant_id === v.variant_id) : undefined;
      if (v.variant_id && !current) return fail(t.common.notFound);
      if (current) {
        // Quantity of existing variants only changes via restock/adjust.
        if (
          current.size !== v.size ||
          current.color !== v.color ||
          current.low_stock_threshold !== v.low_stock_threshold
        ) {
          patches.push({
            variant: current,
            patch: { size: v.size, color: v.color, low_stock_threshold: v.low_stock_threshold, updated_at: now },
          });
        }
      } else {
        added.push({
          variant_id: newId("V"),
          product_id,
          size: v.size,
          color: v.color,
          quantity: v.quantity,
          low_stock_threshold: v.low_stock_threshold,
          updated_at: now,
        });
      }
    }
    // Variants left out of the form stay in the sheet; the full set must still be unique.
    const kept = existing.filter((e) => !data.variants.some((v) => v.variant_id === e.variant_id));
    if (hasDuplicates([...kept, ...data.variants])) return fail(t.products.duplicateVariant);

    await updateProduct(product_id, {
      name: data.name,
      category: data.category,
      description: data.description,
      cost_price_usd: round2(data.cost_price_usd),
      sell_price_usd: round2(data.sell_price_usd),
      image_url: data.image_url,
      updated_at: now,
    });
    await updateVariants(patches);
    await appendVariants(added);
    await appendMovements(
      added
        .filter((v) => v.quantity > 0)
        .map((v) => ({
          movement_id: newId("M"),
          date: now,
          variant_id: v.variant_id,
          type: "restock" as const,
          qty_change: v.quantity,
          reference_id: product_id,
          created_by: user,
          notes: t.products.initialStockNote,
        })),
    );
    return ok({ product_id });
  } catch (err) {
    console.error(`[products] update ${product_id} incomplete`);
    return failFromError(err);
  }
}

const restockSchema = z.object({
  variant_id: z.string().min(1).max(40),
  qty: z.number().int().min(1).max(100_000),
  notes: z.string().trim().max(500),
});

export async function restockVariant(input: z.infer<typeof restockSchema>): Promise<ActionResult<{ quantity: number }>> {
  const user = await requireUser();
  const parsed = restockSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  return changeStock(user, parsed.data.variant_id, parsed.data.qty, "restock", parsed.data.notes);
}

const adjustSchema = z.object({
  variant_id: z.string().min(1).max(40),
  change: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((n) => n !== 0, "Change cannot be 0"),
  notes: z.string().trim().min(1, t.products.adjustNoteRequired).max(500),
});

export async function adjustVariant(input: z.infer<typeof adjustSchema>): Promise<ActionResult<{ quantity: number }>> {
  const user = await requireUser();
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  return changeStock(user, parsed.data.variant_id, parsed.data.change, "adjustment", parsed.data.notes);
}

async function changeStock(
  user: string,
  variant_id: string,
  change: number,
  type: "restock" | "adjustment",
  notes: string,
): Promise<ActionResult<{ quantity: number }>> {
  try {
    const variant = (await listVariants({ fresh: true })).find((v) => v.variant_id === variant_id);
    if (!variant) return fail(t.common.notFound);
    const quantity = variant.quantity + change;
    if (quantity < 0) return fail(t.errors.stockChanged(variantLabel(variant), variant.quantity));
    const now = nowIso();
    await updateVariants([{ variant, patch: { quantity, updated_at: now } }]);
    try {
      await appendMovements([
        {
          movement_id: newId("M"),
          date: now,
          variant_id,
          type,
          qty_change: change,
          reference_id: variant.product_id,
          created_by: user,
          notes,
        },
      ]);
    } catch (err) {
      console.error(`[stock] ${variant_id} set to ${quantity} but the ${type} movement was not recorded`);
      return failFromError(err);
    }
    return ok({ quantity });
  } catch (err) {
    return failFromError(err);
  }
}

export async function setProductActive(product_id: string, active: boolean): Promise<ActionResult<null>> {
  await requireUser();
  const parsed = z.object({ product_id: z.string().min(1).max(40), active: z.boolean() }).safeParse({ product_id, active });
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    await updateProduct(parsed.data.product_id, { active: parsed.data.active, updated_at: nowIso() });
    return ok(null);
  } catch (err) {
    return failFromError(err);
  }
}
