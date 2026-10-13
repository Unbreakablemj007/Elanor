import { appendRows, bool, invalidate, num, readRecords, str, updateRowById, type SheetRecord } from "./client";

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

const TAB = "Products" as const;

function toProduct({ data }: SheetRecord): Product {
  return {
    product_id: str(data.product_id),
    name: str(data.name),
    category: str(data.category),
    description: str(data.description),
    cost_price_usd: num(data.cost_price_usd),
    sell_price_usd: num(data.sell_price_usd),
    image_url: str(data.image_url),
    // Blank "active" cells (e.g. rows typed in by hand) count as active.
    active: bool(data.active, true),
    created_at: str(data.created_at),
    updated_at: str(data.updated_at),
  };
}

export async function listProducts(opts: { fresh?: boolean } = {}): Promise<Product[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toProduct).filter((p) => p.product_id);
}

export async function getProduct(id: string, opts: { fresh?: boolean } = {}): Promise<Product | null> {
  return (await listProducts(opts)).find((p) => p.product_id === id) ?? null;
}

export async function appendProduct(p: Product): Promise<void> {
  await appendRows(TAB, [p]);
  invalidate(TAB);
}

export async function updateProduct(id: string, patch: Partial<Omit<Product, "product_id">>): Promise<void> {
  await updateRowById(TAB, id, patch);
  invalidate(TAB);
}
