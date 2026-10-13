"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { updateSettings } from "@/lib/sheets";

const settingsSchema = z.object({
  exchange_rate_lbp_per_usd: z.number().int("Use a whole number").min(1).max(100_000_000),
  low_stock_default: z.number().int("Use a whole number").min(0).max(10_000),
});

export async function saveSettings(input: z.infer<typeof settingsSchema>): Promise<ActionResult<null>> {
  await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    await updateSettings(parsed.data);
    return ok(null);
  } catch (err) {
    return failFromError(err);
  }
}
