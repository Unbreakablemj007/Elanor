import { readTabs, str } from "./client";

export type Lists = {
  categories: string[];
  sizes: string[];
  colors: string[];
  expense_categories: string[];
};

/** Dropdown values from the Lists tab (one column per list, blanks skipped). */
export async function getLists(): Promise<Lists> {
  const raw = (await readTabs(["Lists"])).Lists;
  const column = (name: keyof Lists) => {
    const idx = raw?.headers.indexOf(name) ?? -1;
    if (!raw || idx < 0) return [];
    const values = raw.rows.map((row) => str(row?.[idx])).filter(Boolean);
    return [...new Set(values)];
  };
  return {
    categories: column("categories"),
    sizes: column("sizes"),
    colors: column("colors"),
    expense_categories: column("expense_categories"),
  };
}
