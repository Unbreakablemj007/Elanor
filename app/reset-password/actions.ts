"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/strings";

export type ResetState = { error?: string };

const schema = z.object({
  next: z.string().min(8, t.password.tooShort).max(72, t.password.tooLong),
  confirm: z.string(),
});

export async function setNewPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = schema.safeParse({ next: formData.get("next"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t.common.unexpectedError };
  if (parsed.data.next !== parsed.data.confirm) return { error: t.password.mismatch };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=link");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) {
    console.error(`[auth] password reset failed: [${error.status ?? "?"}] ${error.message}`);
    if (error.code === "weak_password") return { error: t.password.weak };
    if (error.code === "same_password") return { error: t.password.same };
    return { error: `${t.common.unexpectedError} (${error.message})` };
  }
  redirect("/");
}
