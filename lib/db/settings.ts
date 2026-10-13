import { check, db, invalidate, num, str } from "./client";

export type Settings = {
  shop_name: string;
  exchange_rate_lbp_per_usd: number;
  low_stock_default: number;
  lbp_rounding: number;
};

export type SettingKey = keyof Settings;

const DEFAULTS: Settings = {
  shop_name: "Miss Elanor",
  exchange_rate_lbp_per_usd: 89500,
  low_stock_default: 2,
  lbp_rounding: 5000,
};

export async function getSettings(): Promise<Settings> {
  const supabase = await db();
  const { data, error } = await supabase.from("settings").select("key,value");
  check(error, "read settings");
  const map = new Map((data ?? []).map((r) => [str(r.key), r.value as unknown]));
  const positive = (key: SettingKey, fallback: number) => {
    const n = num(map.get(key));
    return n > 0 ? n : fallback;
  };
  return {
    shop_name: str(map.get("shop_name")) || DEFAULTS.shop_name,
    exchange_rate_lbp_per_usd: positive("exchange_rate_lbp_per_usd", DEFAULTS.exchange_rate_lbp_per_usd),
    low_stock_default: map.has("low_stock_default")
      ? Math.max(0, num(map.get("low_stock_default")))
      : DEFAULTS.low_stock_default,
    lbp_rounding: positive("lbp_rounding", DEFAULTS.lbp_rounding),
  };
}

/** Update setting values by key (adds the key if it is missing). */
export async function updateSettings(values: Partial<Record<SettingKey, string | number>>): Promise<void> {
  const rows = Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ key, value: String(value) }));
  if (rows.length === 0) return;
  const supabase = await db();
  const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
  check(error, "save settings");
  invalidate();
}
