import { appendRows, invalidate, num, numOrNull, readRecords, str, updateRows, type SheetRecord } from "./client";

export type Variant = {
  variant_id: string;
  product_id: string;
  size: string;
  color: string;
  quantity: number;
  /** null = use Settings.low_stock_default */
  low_stock_threshold: number | null;
  updated_at: string;
  rowNumber: number;
};

const TAB = "Variants" as const;

function toVariant({ data, rowNumber }: SheetRecord): Variant {
  return {
    variant_id: str(data.variant_id),
    product_id: str(data.product_id),
    size: str(data.size),
    color: str(data.color),
    quantity: num(data.quantity),
    low_stock_threshold: numOrNull(data.low_stock_threshold),
    updated_at: str(data.updated_at),
    rowNumber,
  };
}

export async function listVariants(opts: { fresh?: boolean } = {}): Promise<Variant[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toVariant).filter((v) => v.variant_id);
}

export type NewVariant = Omit<Variant, "rowNumber">;

export async function appendVariants(variants: NewVariant[]): Promise<void> {
  await appendRows(
    TAB,
    variants.map((v) => ({ ...v, low_stock_threshold: v.low_stock_threshold ?? "" })),
  );
  invalidate(TAB);
}

export type VariantPatch = {
  variant: Variant;
  patch: Partial<Pick<Variant, "size" | "color" | "quantity" | "low_stock_threshold" | "updated_at">>;
};

/**
 * Update variants found in a fresh read (uses their row numbers).
 * Callers must pass variants that came from `listVariants({ fresh: true })`.
 */
export async function updateVariants(patches: VariantPatch[]): Promise<void> {
  await updateRows(
    TAB,
    patches.map(({ variant, patch }) => ({
      rowNumber: variant.rowNumber,
      patch: Object.fromEntries(
        Object.entries(patch).map(([k, v]) => [k, v === null || v === undefined ? "" : v]),
      ),
    })),
  );
  invalidate(TAB);
}
