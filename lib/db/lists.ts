import { check, db, invalidate, str } from "./client";

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

/**
 * Add a value to a dropdown list (e.g. a new category). If the same value
 * already exists (ignoring case), that existing value is returned instead.
 */
export async function addListValue(list: keyof Lists, value: string): Promise<string> {
  const supabase = await db();
  const { data, error } = await supabase.from("lists").select("value, sort_order").eq("list_name", list);
  check(error, "read lists");
  const existing = (data ?? []).find((r) => str(r.value).toLowerCase() === value.toLowerCase());
  if (existing) return str(existing.value);
  const nextOrder = Math.max(0, ...(data ?? []).map((r) => Number(r.sort_order) || 0)) + 1;
  const { error: insertError } = await supabase.from("lists").insert({ list_name: list, value, sort_order: nextOrder });
  check(insertError, "add list value");
  invalidate();
  return value;
}
