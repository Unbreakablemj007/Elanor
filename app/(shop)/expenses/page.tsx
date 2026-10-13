import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui";
import { dayOf, formatDay, formatMonth, isValidMonth, shiftMonth, todayDay } from "@/lib/dates";
import { formatLbp, formatUsd } from "@/lib/format";
import { getLists, getSettings, listExpenses } from "@/lib/sheets";
import { t } from "@/lib/strings";
import ExpenseForm from "./ExpenseForm";

export const metadata = { title: t.expenses.title };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const today = todayDay();
  const thisMonth = today.slice(0, 7);
  const month = params.month && isValidMonth(params.month) ? params.month : thisMonth;

  const [expenses, lists, settings] = await Promise.all([listExpenses(), getLists(), getSettings()]);
  const inMonth = expenses
    .filter((e) => dayOf(e.date).startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = inMonth.reduce((s, e) => s + e.amount_usd, 0);
  const byCategory = [...inMonth.reduce((m, e) => m.set(e.category || "—", (m.get(e.category || "—") ?? 0) + e.amount_usd), new Map<string, number>())].sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <>
      <PageHeader title={t.expenses.title} back="/more" />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
        <ExpenseForm categories={lists.expense_categories} rate={settings.exchange_rate_lbp_per_usd} today={today} />

        <div className="space-y-4">
          <div className="card flex items-center justify-between p-2">
            <Link href={`/expenses?month=${shiftMonth(month, -1)}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg" aria-label="Previous month">
              <ChevronLeftIcon />
            </Link>
            <div className="text-center">
              <p className="font-semibold">{formatMonth(month)}</p>
              <p className="text-sm text-muted">
                {t.expenses.monthTotal}: <strong className="text-ink">{formatUsd(total)}</strong>
              </p>
            </div>
            {month < thisMonth ? (
              <Link href={`/expenses?month=${shiftMonth(month, 1)}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg" aria-label="Next month">
                <ChevronRightIcon />
              </Link>
            ) : (
              <span className="h-11 w-11" />
            )}
          </div>

          {inMonth.length === 0 ? (
            <EmptyState>{t.expenses.empty}</EmptyState>
          ) : (
            <>
              <section className="card">
                <h2 className="mb-3 font-semibold">{t.expenses.byCategory}</h2>
                <ul className="space-y-2 text-sm">
                  {byCategory.map(([cat, amount]) => (
                    <li key={cat}>
                      <div className="flex justify-between">
                        <span>{cat}</span>
                        <span className="font-medium">{formatUsd(amount)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-bg">
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${total > 0 ? (amount / total) * 100 : 0}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <ul className="card divide-y divide-line p-0">
                {inMonth.map((e) => (
                  <li key={e.expense_id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{e.category || "—"}</p>
                      <p className="text-xs text-muted">
                        {formatDay(e.date)}
                        {e.description && ` · ${e.description}`}
                        {e.created_by && ` · ${e.created_by}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatUsd(e.amount_usd)}</p>
                      {e.currency === "LBP" && <p className="text-xs text-muted">{formatLbp(e.amount)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
