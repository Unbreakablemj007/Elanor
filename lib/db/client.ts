/**
 * Low-level database helpers. Only modules in lib/db/ may import this.
 *
 * - Reads go through Supabase as the signed-in user (RLS: staff only).
 * - Multi-step writes call Postgres functions (record_sale, apply_return, …)
 *   so they either fully succeed or change nothing.
 * - Timestamps come back from Postgres in UTC and are converted to the app's
 *   Beirut ISO format (`2026-10-13T14:05:09+03:00`).
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { nowIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export class DbError extends Error {
  /** True when the message was written for the shop staff (raised by our own SQL functions). */
  readonly userFacing: boolean;
  constructor(message: string, userFacing = false) {
    super(message);
    this.name = "DbError";
    this.userFacing = userFacing;
  }
}

export const db = createClient;

/** Throw a DbError for a failed query; logs the message only. */
export function check(error: PostgrestError | null, what: string): void {
  if (!error) return;
  // P0001 = `raise exception` in our SQL functions: a readable, expected message.
  if (error.code === "P0001") throw new DbError(error.message, true);
  console.error(`[db] ${what} failed: [${error.code}] ${error.message}`);
  throw new DbError(`${what} failed: ${error.message}`);
}

const PAGE = 1000; // Supabase returns at most 1000 rows per request.

/** Read every row of a table, page by page, in a stable order. */
export async function selectAll<T>(table: string, orderBy: string, columns = "*"): Promise<T[]> {
  const supabase = await db();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    check(error, `read ${table}`);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/** Call a Postgres function and return its result. */
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = await db();
  const { data, error } = await supabase.rpc(fn, args);
  check(error, fn);
  return data as T;
}

/** Refresh every page after a write. */
export function invalidate(): void {
  revalidatePath("/", "layout");
}

// ---- value converters -----------------------------------------------------

export function str(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function numOrNull(value: unknown): number | null {
  return value === null || value === undefined || value === "" ? null : num(value);
}

/** Postgres timestamp → Beirut ISO string ('' if missing). */
export function iso(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? str(value) : nowIso(d);
}
