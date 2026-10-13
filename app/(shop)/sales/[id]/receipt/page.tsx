import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getCustomer, getSale, getSettings, listItemsForSale } from "@/lib/sheets";
import { t } from "@/lib/strings";
import Receipt from "./Receipt";

export const metadata = { title: t.receipt.title };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, items, settings] = await Promise.all([getSale(id), listItemsForSale(id), getSettings()]);
  if (!sale) notFound();
  const customer = sale.customer_id ? await getCustomer(sale.customer_id) : null;

  return (
    <>
      <PageHeader title={t.receipt.title} back={`/sales/${id}`} />
      <Receipt
        data={{
          shopName: settings.shop_name,
          saleId: sale.sale_id,
          date: sale.date,
          customerName: customer?.name ?? "",
          customerPhone: customer?.phone ?? "",
          items: items.map((i) => ({
            name: i.product_name,
            size: i.size,
            color: i.color,
            qty: i.qty,
            unitPrice: i.unit_price_usd,
            lineTotal: i.line_total_usd,
            returnedQty: i.returned_qty,
          })),
          subtotal: sale.subtotal_usd,
          discount: sale.discount_usd,
          total: sale.total_usd,
          totalLbp: sale.total_lbp,
          paidUsd: sale.paid_usd,
          paidLbp: sale.paid_lbp,
          changeUsd: sale.change_usd,
          changeLbp: sale.change_lbp,
        }}
      />
    </>
  );
}
