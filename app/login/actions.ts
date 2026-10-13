"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { blockedFor, recordFailure, recordSuccess } from "@/lib/auth/rateLimit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getAuthUsers } from "@/lib/auth/users";
import { t } from "@/lib/strings";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

// Compared against when the username is unknown so response time doesn't
// reveal which usernames exist.
const DUMMY_HASH = "$2b$12$deP4NP09Yk67CEwhltF6qu62KLKgIODwxKBV8IcmhINHX6bGohl7m";

export type LoginState = { error?: string; username?: string };

function safeNext(next: string | undefined): string {
  // Only allow same-site relative paths.
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) return { error: t.login.invalid, username: String(formData.get("username") ?? "").slice(0, 100) };
  const { username, password, next } = parsed.data;

  const users = getAuthUsers();
  if (users.length === 0 || !process.env.AUTH_SECRET) return { error: t.login.misconfigured, username };

  const blockedMs = blockedFor(username);
  if (blockedMs > 0) return { error: t.login.blocked(Math.ceil(blockedMs / 60000)), username };

  const user = users.find((u) => u.username === username);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    recordFailure(username);
    const nowBlocked = blockedFor(username);
    return { error: nowBlocked > 0 ? t.login.blocked(Math.ceil(nowBlocked / 60000)) : t.login.invalid, username };
  }

  recordSuccess(username);
  const token = await createSessionToken(user.username);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(safeNext(next));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
