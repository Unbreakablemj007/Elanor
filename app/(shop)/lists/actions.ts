"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { addListValue } from "@/lib/db";
import { t } from "@/lib/strings";

const schema = z.object({
  list: z.enum(["categories", "sizes", "colors", "expense_categories"]),
  value: z
    .string()
    .trim()
    .min(1, t.addOption.required)
    .max(40, t.addOption.tooLong)
    .transform((v) => v.replace(/\s+/g, " ")),
});

/** Add a new option to a dropdown (category, size, colour, expense category). */
export async function addOption(input: z.input<typeof schema>): Promise<ActionResult<{ value: string }>> {
  await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    const value = await addListValue(parsed.data.list, parsed.data.value);
    return ok({ value });
  } catch (err) {
    return failFromError(err);
  }
}
