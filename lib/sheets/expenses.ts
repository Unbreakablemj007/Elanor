import { appendRows, invalidate, num, readRecords, str, type SheetRecord } from "./client";

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

const TAB = "Expenses" as const;

function toExpense({ data }: SheetRecord): Expense {
  return {
    expense_id: str(data.expense_id),
    date: str(data.date),
    category: str(data.category),
    description: str(data.description),
    amount: num(data.amount),
    currency: str(data.currency).toUpperCase() === "LBP" ? "LBP" : "USD",
    exchange_rate: num(data.exchange_rate),
    amount_usd: num(data.amount_usd),
    created_by: str(data.created_by),
  };
}

export async function listExpenses(opts: { fresh?: boolean } = {}): Promise<Expense[]> {
  const records = await readRecords(TAB, opts);
  return records.map(toExpense).filter((e) => e.expense_id);
}

export async function appendExpense(e: Expense): Promise<void> {
  await appendRows(TAB, [e]);
  invalidate(TAB);
}
