/**
 * In-memory brute-force protection: 5 failed attempts for an email blocks
 * it for 15 minutes. Resets when the server instance restarts, which is
 * acceptable for a two-person app.
 */
const MAX_FAILURES = 5;
const BLOCK_MS = 15 * 60 * 1000;

type Entry = { failures: number; blockedUntil: number };
const attempts = new Map<string, Entry>();

const keyOf = (username: string) => username.trim().toLowerCase();

/** Milliseconds left on a block, or 0 if the username may try to log in. */
export function blockedFor(username: string): number {
  const entry = attempts.get(keyOf(username));
  if (!entry) return 0;
  const left = entry.blockedUntil - Date.now();
  if (left > 0) return left;
  if (entry.blockedUntil) attempts.delete(keyOf(username));
  return 0;
}

export function recordFailure(username: string): void {
  const key = keyOf(username);
  const entry = attempts.get(key) ?? { failures: 0, blockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.blockedUntil = Date.now() + BLOCK_MS;
    entry.failures = 0;
  }
  attempts.set(key, entry);
}

export function recordSuccess(username: string): void {
  attempts.delete(keyOf(username));
}
