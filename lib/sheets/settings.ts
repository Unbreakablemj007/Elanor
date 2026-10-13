import { appendRows, invalidate, num, readRecords, str, updateRows } from "./client";

export type Settings = {
  shop_name: string;
  exchange_rate_lbp_per_usd: number;
  low_stock_default: number;
  lbp_rounding: number;
};

export type SettingKey = keyof Settings;

const TAB = "Settings" as const;

const DEFAULTS: Settings = {
  shop_name: "Miss Elanor",
  exchange_rate_lbp_per_usd: 89500,
  low_stock_default: 2,
  lbp_rounding: 5000,
};

export async function getSettings(opts: { fresh?: boolean } = {}): Promise<Settings> {
  const records = await readRecords(TAB, opts);
  const map = new Map(records.map((r) => [str(r.data.key), r.data.value]));
  const positive = (key: SettingKey, fallback: number) => {
    const n = num(map.get(key));
    return n > 0 ? n : fallback;
  };
  return {
    shop_name: str(map.get("shop_name")) || DEFAULTS.shop_name,
    exchange_rate_lbp_per_usd: positive("exchange_rate_lbp_per_usd", DEFAULTS.exchange_rate_lbp_per_usd),
    low_stock_default: map.has("low_stock_default") ? Math.max(0, num(map.get("low_stock_default"))) : DEFAULTS.low_stock_default,
    lbp_rounding: positive("lbp_rounding", DEFAULTS.lbp_rounding),
  };
}

/** Update setting values by key (adds the key row if it is missing). */
export async function updateSettings(values: Partial<Record<SettingKey, string | number>>): Promise<void> {
  const records = await readRecords(TAB, { fresh: true });
  const patches = [];
  const missing = [];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const record = records.find((r) => str(r.data.key) === key);
    if (record) patches.push({ rowNumber: record.rowNumber, patch: { value } });
    else missing.push({ key, value, description: "" });
  }
  await updateRows(TAB, patches);
  await appendRows(TAB, missing);
  invalidate(TAB);
}
