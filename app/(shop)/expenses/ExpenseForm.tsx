"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorBox } from "@/components/ui";
import { formatInt, formatLbp, formatUsd, parseNumber, round2 } from "@/lib/format";
import { t } from "@/lib/strings";
import { createExpense } from "./actions";

export default function ExpenseForm({ categories, rate, today }: { categories: string[]; rate: number; today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "LBP">("USD");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const n = parseNumber(amount);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createExpense({ date, category, description, amount: n, currency });
      if (!res.ok) return setError(res.error);
      setAmount("");
      setDescription("");
      router.push(`/expenses?month=${date.slice(0, 7)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-semibold">{t.expenses.new}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="e-date">
            {t.common.date}
          </label>
          <input id="e-date" type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="e-cat">
            {t.expenses.category}
          </label>
          <select id="e-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <span className="label">{t.expenses.amount}</span>
        <div className="flex gap-2">
          <div className="flex shrink-0 rounded-xl border border-line p-1">
            {(["USD", "LBP"] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`min-h-10 rounded-lg px-3 text-sm font-medium ${currency === c ? "bg-accent-strong text-on-accent" : ""}`}
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
              >
                {c}
              </button>
            ))}
          </div>
          <input className="input text-lg" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required aria-label={t.expenses.amount} />
        </div>
        {n > 0 && (
          <p className="mt-1 text-xs text-muted">
            {currency === "LBP"
              ? `${formatLbp(n)} = ${formatUsd(round2(n / rate))} · ${t.expenses.convertedAt(formatInt(rate))}`
              : formatUsd(n)}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="e-desc">
          {t.expenses.description} <span className="font-normal">({t.common.optional})</span>
        </label>
        <input id="e-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <button type="submit" className="btn-primary w-full" disabled={pending || n <= 0}>
        {pending ? t.common.saving : t.expenses.new}
      </button>
    </form>
  );
}
