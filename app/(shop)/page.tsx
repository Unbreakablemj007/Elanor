import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { Badge, PageHeader } from "@/components/ui";
import { addDays, dayOf, startOfMonth, startOfWeek, todayDay } from "@/lib/dates";
import { formatUsd } from "@/lib/format";
import { bySize, isLowStock, variantLabel } from "@/lib/inventory";
import { groupBy, saleNet } from "@/lib/reports";
import { getLists, getSettings, listExpenses, listProducts, listSaleItems, listSales, listVariants } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/current";
import { t } from "@/lib/strings";

type Period = "today" | "week" | "month";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  if ((await getCurrentStaff())?.role === "cashier") redirect("/sell");
  const { period: raw } = await searchParams;
  const period: Period = raw === "week" || raw === "month" ? raw : "today";

  const [sales, items, expenses, products, variants, settings, lists] = await Promise.all([
    listSales(),
    listSaleItems(),
    listExpenses(),
    listProducts(),
    listVariants(),
    getSettings(),
    getLists(),
  ]);

  const today = todayDay();
  const from = period === "today" ? today : period === "week" ? startOfWeek(today) : startOfMonth(today);
  const inPeriod = (date: string) => {
    const d = dayOf(date);
    return d >= from && d <= today;
  };

  const itemsBySale = groupBy(items, (i) => i.sale_id);
  const periodSales = sales.filter((s) => inPeriod(s.date));
  // Fully returned sales are not real sales: leave them out of the count.
  const keptSales = periodSales.filter((s) => s.status !== "returned");
  const returnedCount = periodSales.length - keptSales.length;
  let revenue = 0;
  let cost = 0;
  for (const s of periodSales) {
    const net = saleNet(s, itemsBySale.get(s.sale_id) ?? []);
    revenue += net.revenue;
    cost += net.cost;
  }
  const expenseTotal = expenses.filter((e) => inPeriod(e.date)).reduce((sum, e) => sum + e.amount_usd, 0);
  const profit = revenue - cost - expenseTotal;

  // Top products by units sold (net of returns) in the period.
  const units = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const s of periodSales) {
    for (const i of itemsBySale.get(s.sale_id) ?? []) {
      const q = i.qty - i.returned_qty;
      if (q <= 0) continue;
      const u = units.get(i.product_id) ?? { name: i.product_name, qty: 0, revenue: 0 };
      u.qty += q;
      u.revenue += i.unit_price_usd * q;
      units.set(i.product_id, u);
    }
  }
  const top = [...units.entries()].sort((a, b) => b[1].qty - a[1].qty || b[1].revenue - a[1].revenue).slice(0, 5);
  const topMax = top[0]?.[1].qty ?? 0;

  // Daily revenue chart: last 7 days, or last 30 for the month view.
  const days = period === "month" ? 30 : 7;
  const revenueByDay = new Map<string, number>();
  for (const s of sales) {
    const d = dayOf(s.date);
    if (d < addDays(today, -(days - 1))) continue;
    revenueByDay.set(d, (revenueByDay.get(d) ?? 0) + saleNet(s, itemsBySale.get(s.sale_id) ?? []).revenue);
  }
  const chart = Array.from({ length: days }, (_, i) => {
    const d = addDays(today, i - (days - 1));
    const date = new Date(`${d}T12:00:00Z`);
    const label =
      days === 7
        ? new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(date)
        : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
    return { key: d, label, value: revenueByDay.get(d) ?? 0 };
  });

  const activeProducts = new Map(products.filter((p) => p.active).map((p) => [p.product_id, p]));
  const lowStock = variants
    .filter((v) => activeProducts.has(v.product_id) && isLowStock(v, settings.low_stock_default))
    .sort((a, b) => a.quantity - b.quantity || bySize(lists.sizes)(a, b));

  const tabs: [Period, string][] = [
    ["today", t.dashboard.today],
    ["week", t.dashboard.week],
    ["month", t.dashboard.month],
  ];

  return (
    <>
      <PageHeader title={t.dashboard.title} />

      <nav className="mb-4 grid grid-cols-3 rounded-xl border border-line bg-surface p-1" aria-label="Period">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={key === "today" ? "/" : `/?period=${key}`}
            className={`flex min-h-10 items-center justify-center rounded-lg text-sm font-medium ${period === key ? "bg-accent-strong text-on-accent" : "text-muted"}`}
            aria-current={period === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t.dashboard.salesCount}
          value={String(keptSales.length)}
          sub={returnedCount > 0 ? t.dashboard.returnedSales(returnedCount) : undefined}
        />
        <Stat label={t.dashboard.revenue} value={formatUsd(revenue)} />
        <Stat label={t.dashboard.profit} value={formatUsd(profit)} tone={profit < 0 ? "danger" : "default"} />
        <Stat label={t.dashboard.expenses} value={formatUsd(expenseTotal)} sub={`${t.dashboard.costOfGoods}: ${formatUsd(cost)}`} />
      </section>
      <p className="-mt-2 mb-4 text-xs text-muted">{t.dashboard.profitNote}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card lg:col-span-2">
          <h2 className="mb-6 font-semibold">{days === 7 ? t.dashboard.last7Days : t.dashboard.last30Days}</h2>
          <BarChart data={chart} format={formatUsd} label={days === 7 ? t.dashboard.last7Days : t.dashboard.last30Days} />
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">{t.dashboard.topProducts}</h2>
          {top.length === 0 ? (
            <p className="py-4 text-sm text-muted">{t.dashboard.noSales}</p>
          ) : (
            <ol className="space-y-3">
              {top.map(([id, u]) => (
                <li key={id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <Link href={`/products/${id}`} className="truncate font-medium hover:underline">
                      {u.name}
                    </Link>
                    <span className="shrink-0 text-muted">
                      {t.dashboard.unitsSold(u.qty)} · {formatUsd(u.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-bg">
                    <div className="h-1.5 rounded-full bg-accent-strong" style={{ width: `${topMax ? (u.qty / topMax) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 flex items-center justify-between font-semibold">
            {t.dashboard.lowStock}
            {lowStock.length > 0 && <Badge tone="warning">{lowStock.length}</Badge>}
          </h2>
          {lowStock.length === 0 ? (
            <p className="py-4 text-sm text-muted">{t.dashboard.noLowStock}</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {lowStock.map((v) => (
                <li key={v.variant_id}>
                  <Link href={`/products/${v.product_id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{activeProducts.get(v.product_id)?.name}</span>
                      <span className="text-muted"> · {variantLabel(v)}</span>
                    </span>
                    <Badge tone={v.quantity === 0 ? "danger" : "warning"}>
                      {v.quantity === 0 ? t.products.outOfStock : t.dashboard.left(v.quantity)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "danger" }) {
  return (
    <div className="card">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums lg:text-2xl ${tone === "danger" ? "text-danger" : ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
