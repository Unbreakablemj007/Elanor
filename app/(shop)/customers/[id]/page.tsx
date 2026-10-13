import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { formatUsd } from "@/lib/format";
import { groupBy, saleNet, statusTone } from "@/lib/reports";
import { getCustomer, listSaleItems, listSales } from "@/lib/db";
import { t } from "@/lib/strings";
import CustomerForm from "../CustomerForm";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, sales, items] = await Promise.all([getCustomer(id), listSales(), listSaleItems()]);
  if (!customer) notFound();

  const own = sales.filter((s) => s.customer_id === id).sort((a, b) => b.date.localeCompare(a.date));
  const itemsBySale = groupBy(items.filter((i) => own.some((s) => s.sale_id === i.sale_id)), (i) => i.sale_id);
  const spent = own.reduce((sum, s) => sum + saleNet(s, itemsBySale.get(s.sale_id) ?? []).revenue, 0);

  return (
    <>
      <PageHeader title={customer.name} subtitle={customer.phone} back="/customers" />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
        <div className="space-y-4">
          <section className="card grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xs text-muted">{t.customers.totalSpent}</p>
              <p className="text-xl font-semibold">{formatUsd(spent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t.customers.purchases}</p>
              <p className="text-xl font-semibold">{own.length}</p>
            </div>
          </section>
          <CustomerForm initial={customer} />
        </div>

        <section className="card">
          <h2 className="mb-2 font-semibold">{t.customers.history}</h2>
          {own.length === 0 ? (
            <p className="py-4 text-sm text-muted">{t.customers.noHistory}</p>
          ) : (
            <ul className="divide-y divide-line">
              {own.map((s) => {
                const its = itemsBySale.get(s.sale_id) ?? [];
                return (
                  <li key={s.sale_id}>
                    <Link href={`/sales/${s.sale_id}`} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{formatDateTime(s.date)}</p>
                        <p className="truncate text-xs text-muted">{its.map((i) => `${i.qty}× ${i.product_name}`).join(", ")}</p>
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
          )}
        </section>
      </div>
    </>
  );
}
