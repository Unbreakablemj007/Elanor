import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { groupBy, saleNet } from "@/lib/reports";
import { listCustomers, listSaleItems, listSales } from "@/lib/db";
import { t } from "@/lib/strings";
import CustomerList from "./CustomerList";

export const metadata = { title: t.customers.title };

export default async function CustomersPage() {
  const [customers, sales, items] = await Promise.all([listCustomers(), listSales(), listSaleItems()]);
  const itemsBySale = groupBy(items, (i) => i.sale_id);
  const stats = new Map<string, { spent: number; count: number }>();
  for (const s of sales) {
    if (!s.customer_id) continue;
    const st = stats.get(s.customer_id) ?? { spent: 0, count: 0 };
    st.spent += saleNet(s, itemsBySale.get(s.sale_id) ?? []).revenue;
    st.count += 1;
    stats.set(s.customer_id, st);
  }

  return (
    <>
      <PageHeader
        title={t.customers.title}
        back="/more"
        action={
          <Link href="/customers/new" className="btn-primary btn-sm">
            <PlusIcon width={18} height={18} />
            {t.customers.new}
          </Link>
        }
      />
      <CustomerList
        customers={customers.map((c) => ({
          customer_id: c.customer_id,
          name: c.name,
          phone: c.phone,
          spent: stats.get(c.customer_id)?.spent ?? 0,
          count: stats.get(c.customer_id)?.count ?? 0,
        }))}
      />
    </>
  );
}
