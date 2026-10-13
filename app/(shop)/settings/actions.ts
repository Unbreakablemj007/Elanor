"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current";
import { fail, failFromError, ok, zodMessage, type ActionResult } from "@/lib/actions/result";
import { updateSettings } from "@/lib/db";
import { t } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

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

const passwordSchema = z.object({
  current: z.string().min(1, t.password.currentRequired).max(200),
  next: z.string().min(8, t.password.tooShort).max(72, t.password.tooLong),
});

/** Change the signed-in user's own password (the current one is checked first). */
export async function changePassword(input: z.infer<typeof passwordSchema>): Promise<ActionResult<null>> {
  await requireUser();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  const { current, next } = parsed.data;
  if (current === next) return fail(t.password.same);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail(t.common.unexpectedError);

  const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (check.error) {
    if (check.error.status === 429) return fail(t.login.blocked(5));
    return fail(t.password.wrongCurrent);
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error(`[auth] password change failed: [${error.status ?? "?"}] ${error.message}`);
    return fail(error.code === "weak_password" ? t.password.weak : `${t.common.unexpectedError} (${error.message})`);
  }
  return ok(null);
}
