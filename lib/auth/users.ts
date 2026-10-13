import { z } from "zod";

const userSchema = z.object({
  username: z.string().trim().min(1, "username is empty"),
  passwordHash: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/, "passwordHash is not a bcrypt hash"),
});
const usersSchema = z.array(userSchema).min(1, "the list is empty");

export type AuthUser = z.infer<typeof userSchema>;

type Loaded = { users: AuthUser[]; problem: string | null };
let cached: Loaded | null = null;

/**
 * Undo common copy-paste damage: surrounding quotes, "smart" quotes from
 * notes apps, and the `\$` escaping meant only for .env.local.
 */
function normalize(raw: string): string {
  let s = raw.trim();
  if (s.length > 1 && (s[0] === "'" || s[0] === '"') && s.at(-1) === s[0]) s = s.slice(1, -1).trim();
  return s.replace(/[“”„‟″]/g, '"').replace(/\\\$/g, "$");
}

function load(): Loaded {
  const raw = process.env.AUTH_USERS;
  if (!raw || !raw.trim()) return { users: [], problem: "AUTH_USERS is not set" };
  let json: unknown;
  try {
    json = JSON.parse(normalize(raw));
  } catch {
    return { users: [], problem: "AUTH_USERS is not valid JSON" };
  }
  if (json && typeof json === "object" && !Array.isArray(json)) json = [json];
  const parsed = usersSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = typeof issue?.path[0] === "number" ? ` (user ${issue.path[0] + 1})` : "";
    return { users: [], problem: `AUTH_USERS${where}: ${issue?.message ?? "invalid"}` };
  }
  return { users: parsed.data, problem: null };
}

function loaded(): Loaded {
  if (cached?.problem === null) return cached;
  cached = load();
  // Says what is wrong without ever printing the value or any hash.
  if (cached.problem) console.error(`[auth] ${cached.problem}`);
  return cached;
}

/** Users from AUTH_USERS (empty if the variable is missing or invalid). */
export function getAuthUsers(): AuthUser[] {
  return loaded().users;
}

/** A safe, human-readable description of what is misconfigured, or null. */
export function authConfigProblem(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return "AUTH_SECRET is not set";
  if (secret.length < 32) return "AUTH_SECRET must be at least 32 characters";
  return loaded().problem;
}

export function isKnownUser(username: string): boolean {
  return getAuthUsers().some((u) => u.username === username);
}
