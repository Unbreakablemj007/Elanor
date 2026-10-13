import { check, db, invalidate, num, selectAll, str } from "./client";

export type Currency = "USD" | "LBP";

export type Expense = {
  expense_id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  currency: Currency;
  exchange_rate: number;
  amount_usd: number;
  created_by: string;
};

function toExpense(r: Record<string, unknown>): Expense {
  return {
    expense_id: str(r.expense_id),
    date: str(r.date),
    category: str(r.category),
    description: str(r.description),
    amount: num(r.amount),
    currency: str(r.currency).toUpperCase() === "LBP" ? "LBP" : "USD",
    exchange_rate: num(r.exchange_rate),
    amount_usd: num(r.amount_usd),
    created_by: str(r.created_by),
  };
}

export async function listExpenses(): Promise<Expense[]> {
  return (await selectAll<Record<string, unknown>>("expenses", "date")).map(toExpense);
}

export async function appendExpense(e: Expense): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from("expenses").insert(e);
  check(error, "add expense");
  invalidate();
}
