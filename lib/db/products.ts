import { check, db, DbError, invalidate, iso, num, rpc, str } from "./client";
import type { Movement } from "./movements";
import type { NewVariant } from "./variants";

export type Product = {
  product_id: string;
  name: string;
  category: string;
  description: string;
  cost_price_usd: number;
  sell_price_usd: number;
  image_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Row = Record<string, unknown>;
const COLUMNS = "product_id,name,category,description,cost_price_usd,sell_price_usd,image_url,active,created_at,updated_at";

function toProduct(r: Row): Product {
  return {
    product_id: str(r.product_id),
    name: str(r.name),
    category: str(r.category),
    description: str(r.description),
    cost_price_usd: num(r.cost_price_usd),
    sell_price_usd: num(r.sell_price_usd),
    image_url: str(r.image_url),
    active: r.active !== false,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  };
}

export async function listProducts(): Promise<Product[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("products").select(COLUMNS).order("created_at").limit(10000);
  check(error, "read products");
  return (data ?? []).map(toProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("products").select(COLUMNS).eq("product_id", id).maybeSingle();
  check(error, "read product");
  return data ? toProduct(data) : null;
}

/** Product, its sizes and opening stock, saved together. */
export async function createProductRecord(p: Product, variants: NewVariant[], movements: Movement[]): Promise<void> {
  await rpc("create_product", { p_product: p, p_variants: variants, p_movements: movements });
  invalidate();
}

export type ProductDetails = Pick<
  Product,
  "name" | "category" | "description" | "cost_price_usd" | "sell_price_usd" | "image_url" | "updated_at"
>;

export type VariantEdit = {
  variant_id: string;
  size: string;
  color: string;
  low_stock_threshold: number | null;
  updated_at: string;
};

/** Product details, edited sizes, new sizes and their opening stock, saved together. */
export async function saveProductRecord(
  product_id: string,
  details: ProductDetails,
  edits: VariantEdit[],
  added: NewVariant[],
  movements: Movement[],
): Promise<void> {
  await rpc("save_product", {
    p_product_id: product_id,
    p_product: details,
    p_variant_patches: edits,
    p_new_variants: added,
    p_movements: movements,
  });
  invalidate();
}

export async function updateProduct(id: string, patch: Partial<Omit<Product, "product_id">>): Promise<void> {
  const supabase = await db();
  const { data, error } = await supabase.from("products").update(patch).eq("product_id", id).select("product_id");
  check(error, "update product");
  if (!data?.length) throw new DbError(`${id} was not found.`, true);
  invalidate();
}
