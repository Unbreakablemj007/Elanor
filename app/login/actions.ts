"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { blockedFor, recordFailure, recordSuccess } from "@/lib/auth/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";
import { t } from "@/lib/strings";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const typed = String(formData.get("email") ?? "").slice(0, 200);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) return { error: t.login.invalid, email: typed };
  const { email, password, next } = parsed.data;

  const blockedMs = blockedFor(email);
  if (blockedMs > 0) return { error: t.login.blocked(Math.ceil(blockedMs / 60000)), email };

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    return { error: t.login.misconfigured(err instanceof Error ? err.message : String(err)), email };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error && error.status !== 400 && error.status !== 401 && error.status !== 422) {
      console.error(`[auth] sign-in failed: [${error.status ?? "?"}] ${error.message}`);
      return { error: error.status === 429 ? t.login.blocked(5) : t.login.unavailable, email };
    }
    recordFailure(email);
    const nowBlocked = blockedFor(email);
    return { error: nowBlocked > 0 ? t.login.blocked(Math.ceil(nowBlocked / 60000)) : t.login.invalid, email };
  }

  // A valid Supabase account still needs to be on the staff list.
  const { data: staff } = await supabase.from("staff").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!staff) {
    await supabase.auth.signOut();
    return { error: t.login.noAccess, email };
  }

  recordSuccess(email);
  redirect(safeNext(next));
}

export async function logout(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Already signed out or not configured: just go to the login page.
  }
  redirect("/login");
}
