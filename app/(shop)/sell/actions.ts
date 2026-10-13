"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { nowIso } from "@/lib/dates";
import { round2 } from "@/lib/format";
import { newId } from "@/lib/ids";
import { variantLabel } from "@/lib/inventory";
import { computeDiscount, computePayment } from "@/lib/payment";
import {
  getSettings,
  listCustomers,
  listProducts,
  listVariants,
  recordSale,
  type Movement,
  type Sale,
  type SaleItem,
} from "@/lib/db";
import { t } from "@/lib/strings";

const saleSchema = z.object({
  items: z
    .array(z.object({ variant_id: z.string().min(1).max(40), qty: z.number().int().min(1).max(1000) }))
    .min(1, t.sell.cartEmpty)
    .max(200),
  customer_id: z.string().max(40),
  discount: z.object({ type: z.enum(["usd", "pct"]), value: z.number().finite().min(0).max(1_000_000) }),
  paid_usd: z.number().finite().min(0).max(1_000_000),
  paid_lbp: z.number().finite().min(0).max(100_000_000_000),
  change_in: z.enum(["usd", "lbp"]),
  notes: z.string().trim().max(500),
  // What the cashier saw, so we never charge something different.
  expected_total_usd: z.number().finite(),
  expected_rate: z.number().finite(),
});

export type SaleInput = z.infer<typeof saleSchema>;

export async function createSale(input: SaleInput): Promise<ActionResult<{ sale_id: string }>> {
  const user = await requireUser();
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const data = parsed.data;

  // Combine repeated lines for the same variant.
  const wanted = new Map<string, number>();
  for (const i of data.items) wanted.set(i.variant_id, (wanted.get(i.variant_id) ?? 0) + i.qty);

  const sale_id = newId("S");
  let variants, products, settings, customers;
  try {
    // Live reads for a friendly stock check; the database re-checks stock
    // when the sale is saved, so two phones can never oversell.
    [variants, products, settings, customers] = await Promise.all([
      listVariants(),
      listProducts(),
      getSettings(),
      data.customer_id ? listCustomers() : Promise.resolve([]),
    ]);
  } catch (err) {
    return failFromError(err);
  }

  if (data.customer_id && !customers.some((c) => c.customer_id === data.customer_id)) {
    return fail(`${t.sell.customer}: ${t.common.notFound}`);
  }

  const rate = settings.exchange_rate_lbp_per_usd;
  if (rate !== data.expected_rate) return fail(t.sell.rateChanged);

  const now = nowIso();
  const items: SaleItem[] = [];
  for (const [variant_id, qty] of wanted) {
    const variant = variants.find((v) => v.variant_id === variant_id);
    const product = variant && products.find((p) => p.product_id === variant.product_id);
    if (!variant || !product || !product.active) return fail(`${t.common.notFound} (${variant_id})`);
    if (variant.quantity < qty) {
      return fail(t.errors.stockChanged(`${product.name} ${variantLabel(variant)}`, Math.max(0, variant.quantity)));
    }
    items.push({
      line_id: newId("L"),
      sale_id,
      variant_id,
      product_id: product.product_id,
      product_name: product.name,
      size: variant.size,
      color: variant.color,
      qty,
      unit_price_usd: product.sell_price_usd,
      unit_cost_usd: product.cost_price_usd,
      line_total_usd: round2(product.sell_price_usd * qty),
      returned_qty: 0,
    });
  }

  const subtotal = round2(items.reduce((s, i) => s + i.line_total_usd, 0));
  const discount = computeDiscount(subtotal, data.discount);
  const total = round2(subtotal - discount);
  if (Math.abs(total - data.expected_total_usd) > 0.005) return fail(t.sell.pricesChanged);

  const payment = computePayment({
    totalUsd: total,
    rate,
    rounding: settings.lbp_rounding,
    paidUsd: data.paid_usd,
    paidLbp: data.paid_lbp,
  });
  if (!payment.sufficient) return fail(t.sell.insufficientPayment);

  const sale: Sale = {
    sale_id,
    date: now,
    customer_id: data.customer_id,
    subtotal_usd: subtotal,
    discount_usd: discount,
    total_usd: total,
    exchange_rate: rate,
    total_lbp: payment.totalLbp,
    paid_usd: round2(data.paid_usd),
    paid_lbp: Math.round(data.paid_lbp),
    // Record the change in the currency actually handed back.
    change_usd: data.change_in === "usd" ? payment.changeUsd : 0,
    change_lbp: data.change_in === "lbp" ? payment.changeLbp : 0,
    payment_method: "cash",
    status: "completed",
    created_by: user,
    notes: data.notes,
  };

  const movements: Movement[] = items.map((i) => ({
    movement_id: newId("M"),
    date: now,
    variant_id: i.variant_id,
    type: "sale",
    qty_change: -i.qty,
    reference_id: sale_id,
    created_by: user,
    notes: "",
  }));

  // One database call: the sale, its lines and the stock decrease are saved
  // together, or nothing is saved.
  try {
    await recordSale(sale, items, movements);
  } catch (err) {
    return failFromError(err);
  }
  return ok({ sale_id });
}
