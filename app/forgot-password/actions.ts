"use server";

import { z } from "zod";
import { blockedFor, recordFailure } from "@/lib/auth/rateLimit";
import { PASSWORD_RESET_EMAIL_ENABLED } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/strings";
import { requestOrigin } from "@/lib/url";

export type ForgotState = { sent?: boolean; error?: string; email?: string };

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  if (!PASSWORD_RESET_EMAIL_ENABLED) return { error: t.common.unexpectedError };
  const typed = String(formData.get("email") ?? "").slice(0, 200);
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: t.forgot.invalidEmail, email: typed };
  const { email } = parsed.data;

  // Reuse the login limiter so the reset form can't be used to spam an inbox.
  const key = `reset:${email}`;
  const blockedMs = blockedFor(key);
  if (blockedMs > 0) return { error: t.login.blocked(Math.ceil(blockedMs / 60000)), email };
  recordFailure(key);

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error) {
    // Logged for the owner; the screen never reveals whether an email exists.
    console.error(`[auth] reset email failed: [${error.status ?? "?"}] ${error.code ?? ""} ${error.message}`);
    if (error.status === 429) return { error: t.forgot.tooMany, email };
  }
  return { sent: true, email };
}
