/**
 * Low-level Google Sheets access. Only modules in lib/sheets/ may import this.
 *
 * - Whole tabs are read with spreadsheets.values.batchGet and mapped to
 *   objects by header name (never by column index).
 * - Reads are cached for 30s with one tag per tab; every write revalidates
 *   the tags of the tabs it touched.
 * - Errors are logged by message only: Google client errors carry request
 *   config (including auth headers), so the full object is never logged.
 */
import { google, type sheets_v4 } from "googleapis";
import { revalidateTag, unstable_cache } from "next/cache";

export const TABS = [
  "Products",
  "Variants",
  "Sales",
  "Sale_Items",
  "Customers",
  "Expenses",
  "Stock_Movements",
  "Settings",
  "Lists",
] as const;
export type TabName = (typeof TABS)[number];

export type Cell = string | number | boolean;

/** One data row, keyed by header name. `rowNumber` is the 1-based sheet row. */
export type SheetRecord = { rowNumber: number; data: Record<string, Cell> };

type RawTab = { headers: string[]; rows: Cell[][] };

const CACHE_SECONDS = 30;

export class SheetsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetsError";
  }
}

let sheetsClient: sheets_v4.Sheets | null = null;

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new SheetsError("GOOGLE_SHEET_ID is not set.");
  return id;
}

function getClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Vercel/.env store the key with literal "\n"; turn them into real newlines.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new SheetsError("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY are not set.");
  }
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown; status?: unknown };
    const code = e.code ?? e.status;
    return `${code ? `[${String(code)}] ` : ""}${typeof e.message === "string" ? e.message : "unknown error"}`;
  }
  return String(err);
}

async function call<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof SheetsError) throw err;
    const msg = describeError(err);
    console.error(`[sheets] ${what} failed: ${msg}`);
    throw new SheetsError(`${what} failed: ${msg}`);
  }
}

const quote = (tab: TabName) => `'${tab}'`;

export function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function fetchTabs(tabs: TabName[]): Promise<Record<string, RawTab>> {
  const res = await call(`read ${tabs.join(", ")}`, () =>
    getClient().spreadsheets.values.batchGet({
      spreadsheetId: getSpreadsheetId(),
      ranges: tabs.map(quote),
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    }),
  );
  const out: Record<string, RawTab> = {};
  const ranges = res.data.valueRanges ?? [];
  tabs.forEach((tab, i) => {
    const values = (ranges[i]?.values ?? []) as Cell[][];
    const headers = (values[0] ?? []).map((h) => String(h ?? "").trim());
    out[tab] = { headers, rows: values.slice(1) };
  });
  return out;
}

const cachedReaders = new Map<string, () => Promise<Record<string, RawTab>>>();

export const tabTag = (tab: TabName) => `sheet:${tab}`;

/**
 * Read several tabs in one batchGet. Cached for 30s unless `fresh` is set
 * (use `fresh` right before writes that depend on current values).
 */
export async function readTabs(tabs: TabName[], opts: { fresh?: boolean } = {}): Promise<Record<string, RawTab>> {
  const sorted = [...new Set(tabs)].sort() as TabName[];
  if (opts.fresh) return fetchTabs(sorted);
  const key = sorted.join(",");
  let reader = cachedReaders.get(key);
  if (!reader) {
    reader = unstable_cache(() => fetchTabs(sorted), ["sheets", key], {
      revalidate: CACHE_SECONDS,
      tags: sorted.map(tabTag),
    });
    cachedReaders.set(key, reader);
  }
  return reader();
}

/** Convert a raw tab into records, skipping blank rows safely. */
export function toRecords(raw: RawTab | undefined): SheetRecord[] {
  if (!raw) return [];
  const records: SheetRecord[] = [];
  raw.rows.forEach((row, i) => {
    if (!row || row.every((c) => c === "" || c === null || c === undefined)) return;
    const data: Record<string, Cell> = {};
    raw.headers.forEach((h, col) => {
      if (h) data[h] = row[col] ?? "";
    });
    records.push({ rowNumber: i + 2, data });
  });
  return records;
}

export async function readRecords(tab: TabName, opts: { fresh?: boolean } = {}): Promise<SheetRecord[]> {
  const raw = await readTabs([tab], opts);
  return toRecords(raw[tab]);
}

// Header rows never change at runtime (tabs/headers must not be renamed), so
// keep them in memory for the life of the server process.
const headerCache = new Map<TabName, string[]>();

export async function getHeaders(tab: TabName): Promise<string[]> {
  const cached = headerCache.get(tab);
  if (cached) return cached;
  const res = await call(`read ${tab} headers`, () =>
    getClient().spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range: `${quote(tab)}!1:1` }),
  );
  const headers = ((res.data.values?.[0] ?? []) as Cell[]).map((h) => String(h ?? "").trim());
  if (headers.length === 0) throw new SheetsError(`Tab ${tab} has no header row.`);
  headerCache.set(tab, headers);
  return headers;
}

function checkKeys(tab: TabName, headers: string[], obj: Record<string, Cell>) {
  for (const k of Object.keys(obj)) {
    if (!headers.includes(k)) throw new SheetsError(`Column "${k}" does not exist in tab ${tab}.`);
  }
}

/** Append new rows (values.append), mapping object keys to header columns. */
export async function appendRows(tab: TabName, objects: Record<string, Cell>[]): Promise<void> {
  if (objects.length === 0) return;
  const headers = await getHeaders(tab);
  const values = objects.map((obj) => {
    checkKeys(tab, headers, obj);
    return headers.map((h) => obj[h] ?? "");
  });
  await call(`append to ${tab}`, () =>
    getClient().spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${quote(tab)}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    }),
  );
}

export type RowPatch = { rowNumber: number; patch: Record<string, Cell> };

/**
 * Update existing rows. Each patch is written to that row's own cells only,
 * so columns the app doesn't know about are never overwritten.
 */
export async function updateRows(tab: TabName, patches: RowPatch[]): Promise<void> {
  if (patches.length === 0) return;
  const headers = await getHeaders(tab);
  const data: sheets_v4.Schema$ValueRange[] = [];
  for (const { rowNumber, patch } of patches) {
    if (rowNumber < 2) throw new SheetsError(`Refusing to write over the header of ${tab}.`);
    checkKeys(tab, headers, patch);
    for (const [key, value] of Object.entries(patch)) {
      const col = columnLetter(headers.indexOf(key));
      data.push({ range: `${quote(tab)}!${col}${rowNumber}`, values: [[value]] });
    }
  }
  await call(`update ${tab}`, () =>
    getClient().spreadsheets.values.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: { valueInputOption: "RAW", data },
    }),
  );
}

/** Find a row by the value of its first (ID) column using a fresh read. */
export async function findRecordById(tab: TabName, id: string): Promise<SheetRecord | null> {
  const headers = await getHeaders(tab);
  const records = await readRecords(tab, { fresh: true });
  return records.find((r) => str(r.data[headers[0]]) === id) ?? null;
}

/** Update a single row found by ID. Throws if the ID does not exist. */
export async function updateRowById(tab: TabName, id: string, patch: Record<string, Cell>): Promise<void> {
  const record = await findRecordById(tab, id);
  if (!record) throw new SheetsError(`${id} was not found in ${tab}.`);
  await updateRows(tab, [{ rowNumber: record.rowNumber, patch }]);
}

/** Drop cached reads for the given tabs (call after every write). */
export function invalidate(...tabs: TabName[]): void {
  for (const tab of new Set(tabs)) revalidateTag(tabTag(tab));
}

// ---- safe cell converters -------------------------------------------------

export function str(value: Cell | undefined | null): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function num(value: Cell | undefined | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  const s = str(value).replace(/[,\s$]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Number or null when the cell is blank. */
export function numOrNull(value: Cell | undefined | null): number | null {
  return str(value) === "" ? null : num(value);
}

export function bool(value: Cell | undefined | null, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const s = str(value).toUpperCase();
  if (s === "TRUE" || s === "YES" || s === "1") return true;
  if (s === "FALSE" || s === "NO" || s === "0") return false;
  return fallback;
}
