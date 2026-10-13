import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { addDays, dayOf, formatDateTime, formatDay, isValidDay, todayDay } from "@/lib/dates";
import { formatUsd } from "@/lib/format";
import { groupBy, saleNet, statusTone } from "@/lib/reports";
import { listCustomers, listSaleItems, listSales } from "@/lib/db";
import { t } from "@/lib/strings";

export const metadata = { title: t.sales.title };

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const today = todayDay();
  let from = params.from && isValidDay(params.from) ? params.from : addDays(today, -6);
  let to = params.to && isValidDay(params.to) ? params.to : today;
  if (from > to) [from, to] = [to, from];

  const [sales, items, customers] = await Promise.all([listSales(), listSaleItems(), listCustomers()]);
  const customerNames = new Map(customers.map((c) => [c.customer_id, c.name]));
  const itemsBySale = groupBy(items, (i) => i.sale_id);

  const inRange = sales
    .filter((s) => {
      const d = dayOf(s.date);
      return d >= from && d <= to;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const net = inRange.reduce((sum, s) => sum + saleNet(s, itemsBySale.get(s.sale_id) ?? []).revenue, 0);
  const byDay = groupBy(inRange, (s) => dayOf(s.date));

  return (
    <>
      <PageHeader title={t.sales.title} subtitle={`${t.sales.count(inRange.filter((s) => s.status !== "returned").length)} · ${formatUsd(net)}`} />

      <form className="card mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
        <div>
          <label className="label" htmlFor="from">
            {t.common.from}
          </label>
          <input id="from" name="from" type="date" className="input" defaultValue={from} max={today} />
        </div>
        <div>
          <label className="label" htmlFor="to">
            {t.common.to}
          </label>
          <input id="to" name="to" type="date" className="input" defaultValue={to} max={today} />
        </div>
        <button type="submit" className="btn-primary col-span-2 sm:col-span-1">
          {t.common.apply}
        </button>
      </form>

      {inRange.length === 0 ? (
        <EmptyState
          action={
            <Link href="/sell" className="btn-primary btn-sm">
              {t.sell.title}
            </Link>
          }
        >
          {t.sales.empty}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {[...byDay].map(([day, daySales]) => (
            <section key={day}>
              <h2 className="mb-2 flex justify-between text-sm font-medium text-muted">
                <span>{formatDay(day)}</span>
                <span>{formatUsd(daySales.reduce((s, x) => s + saleNet(x, itemsBySale.get(x.sale_id) ?? []).revenue, 0))}</span>
              </h2>
              <ul className="card divide-y divide-line p-0">
                {daySales.map((s) => {
                  const its = itemsBySale.get(s.sale_id) ?? [];
                  const count = its.reduce((n, i) => n + i.qty, 0);
                  return (
                    <li key={s.sale_id}>
                      <Link href={`/sales/${s.sale_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{customerNames.get(s.customer_id) ?? t.sell.walkIn}</p>
                          <p className="truncate text-xs text-muted">
                            {formatDateTime(s.date).split(", ")[1]} · {s.sale_id} · {count} {t.sales.items.toLowerCase()}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">{formatUsd(s.total_usd)}</p>
                          {s.status !== "completed" && <Badge tone={statusTone(s.status)}>{t.sales.status[s.status]}</Badge>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
