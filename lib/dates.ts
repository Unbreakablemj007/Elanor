/**
 * Date helpers. Everything is expressed in Asia/Beirut time.
 * Stored timestamps look like `2026-10-13T14:05:09+03:00`; date-only values
 * look like `2026-10-13`. Comparisons use the `YYYY-MM-DD` day prefix.
 */

export const TIME_ZONE = "Asia/Beirut";

type Parts = { year: string; month: string; day: string; hour: string; minute: string; second: string };

function beirutParts(date: Date): Parts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out as Parts;
}

function beirutOffset(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" });
  const name = fmt.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "GMT+02:00";
  const m = name.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] ?? "00"}` : "+02:00";
}

/** Current moment as an ISO string with the Beirut offset. */
export function nowIso(date: Date = new Date()): string {
  const p = beirutParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${beirutOffset(date)}`;
}

/** Today's Beirut calendar day as `YYYY-MM-DD`. */
export function todayDay(date: Date = new Date()): string {
  const p = beirutParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Beirut calendar day (`YYYY-MM-DD`) of a stored value; '' if unparseable. */
export function dayOf(value: string): string {
  if (!value) return "";
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : todayDay(d);
}

/** Add days to a `YYYY-MM-DD` string. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `day`. */
export function startOfWeek(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -dow);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function isValidDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Human date like `13 Oct 2026`. */
export function formatDay(value: string): string {
  const day = dayOf(value);
  if (!day) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

/** Human date+time like `13 Oct 2026, 14:05` (Beirut wall clock as stored). */
export function formatDateTime(value: string): string {
  const m = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return formatDay(value);
  return `${formatDay(m[1])}, ${m[2]}:${m[3]}`;
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`),
  );
}

export function shiftMonth(month: string, n: number): string {
  const d = new Date(`${month}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}
