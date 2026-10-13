import { z } from "zod";

const usersSchema = z.array(
  z.object({
    username: z.string().trim().min(1),
    passwordHash: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/, "not a bcrypt hash"),
  }),
);

export type AuthUser = z.infer<typeof usersSchema>[number];

let cached: AuthUser[] | null = null;

/** Users from AUTH_USERS. Never logs hashes; only says what is wrong. */
export function getAuthUsers(): AuthUser[] {
  if (cached) return cached;
  const raw = process.env.AUTH_USERS;
  if (!raw) {
    console.error("[auth] AUTH_USERS is not set.");
    return [];
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error("[auth] AUTH_USERS is not valid JSON.");
    return [];
  }
  const parsed = usersSchema.safeParse(json);
  if (!parsed.success) {
    console.error(
      "[auth] AUTH_USERS is invalid (in .env.local every $ in a hash must be written as \\$):",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
    return [];
  }
  cached = parsed.data;
  return cached;
}

export function isKnownUser(username: string): boolean {
  return getAuthUsers().some((u) => u.username === username);
}
