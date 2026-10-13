import { z } from "zod";
import { SheetsError } from "@/lib/sheets/client";
import { t } from "@/lib/strings";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/** First zod issue as a readable message. */
export function zodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return t.common.unexpectedError;
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Turn thrown errors into a user-facing result (details are already logged). */
export function failFromError(err: unknown): ActionResult<never> {
  if (err instanceof SheetsError) return fail(`${t.errors.sheetsUnavailable} (${err.message})`);
  console.error("[action] unexpected error:", err instanceof Error ? err.message : String(err));
  return fail(t.common.unexpectedError);
}
