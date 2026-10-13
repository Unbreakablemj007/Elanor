import { check, db, str } from "./client";

export type Lists = {
  categories: string[];
  sizes: string[];
  colors: string[];
  expense_categories: string[];
};

/** Dropdown values from the `lists` table, in sort_order. */
export async function getLists(): Promise<Lists> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("lists")
    .select("list_name,value")
    .order("sort_order")
    .order("value");
  check(error, "read lists");
  const column = (name: keyof Lists) =>
    (data ?? []).filter((r) => r.list_name === name).map((r) => str(r.value)).filter(Boolean);
  return {
    categories: column("categories"),
    sizes: column("sizes"),
    colors: column("colors"),
    expense_categories: column("expense_categories"),
  };
}
