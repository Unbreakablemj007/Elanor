"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorBox } from "@/components/ui";
import { formatLbp, parseNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import { saveSettings } from "./actions";

export default function SettingsForm({ rate, lowStockDefault }: { rate: number; lowStockDefault: number }) {
  const router = useRouter();
  const [rateValue, setRateValue] = useState(String(rate));
  const [lowStock, setLowStock] = useState(String(lowStockDefault));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const rateN = parseNumber(rateValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await saveSettings({ exchange_rate_lbp_per_usd: rateN, low_stock_default: parseNumber(lowStock) });
      if (!res.ok) return setError(res.error);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="rate">
          {t.settings.exchangeRate}
        </label>
        <input id="rate" className="input text-lg" inputMode="numeric" value={rateValue} onChange={(e) => setRateValue(e.target.value)} required />
        <p className="mt-1 text-xs text-muted">
          {rateN > 0 && `$1 = ${formatLbp(rateN)} · `}
          {t.settings.exchangeRateHelp}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="low">
          {t.settings.lowStockDefault}
        </label>
        <input id="low" className="input" inputMode="numeric" value={lowStock} onChange={(e) => setLowStock(e.target.value)} required />
        <p className="mt-1 text-xs text-muted">{t.settings.lowStockDefaultHelp}</p>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {saved && <p className="text-sm text-success">{t.settings.saved}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.saving : t.common.save}
      </button>
    </form>
  );
}
