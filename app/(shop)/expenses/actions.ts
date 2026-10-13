"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { isValidDay } from "@/lib/dates";
import { round2 } from "@/lib/format";
import { newId } from "@/lib/ids";
import { appendExpense, getSettings } from "@/lib/sheets";

const expenseSchema = z.object({
  date: z.string().refine(isValidDay, "Invalid date"),
  category: z.string().trim().min(1, "Category is required").max(60),
  description: z.string().trim().max(500),
  amount: z.number().finite().positive("Amount must be more than 0").max(100_000_000_000),
  currency: z.enum(["USD", "LBP"]),
});

export async function createExpense(input: z.infer<typeof expenseSchema>): Promise<ActionResult<null>> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const e = parsed.data;
  try {
    const rate = (await getSettings({ fresh: true })).exchange_rate_lbp_per_usd;
    const amount = e.currency === "LBP" ? Math.round(e.amount) : round2(e.amount);
    await appendExpense({
      expense_id: newId("E"),
      date: e.date,
      category: e.category,
      description: e.description,
      amount,
      currency: e.currency,
      exchange_rate: rate,
      amount_usd: e.currency === "LBP" ? round2(amount / rate) : amount,
      created_by: user,
    });
    return ok(null);
  } catch (err) {
    return failFromError(err);
  }
}
