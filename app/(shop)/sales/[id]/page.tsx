import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { formatInt, formatLbp, formatUsd } from "@/lib/format";
import { saleNet, statusTone } from "@/lib/reports";
import { getCustomer, getSale, listItemsForSale } from "@/lib/db";
import { t } from "@/lib/strings";
import ReturnForm from "./ReturnForm";

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, items] = await Promise.all([getSale(id), listItemsForSale(id)]);
  if (!sale) notFound();
  const customer = sale.customer_id ? await getCustomer(sale.customer_id) : null;
  const net = saleNet(sale, items);

  return (
    <>
      <PageHeader
        title={sale.sale_id}
        subtitle={formatDateTime(sale.date)}
        back="/sales"
        action={
          <Link href={`/sales/${id}/receipt`} className="btn-secondary btn-sm">
            {t.sales.viewReceipt}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <ReturnForm
          saleId={sale.sale_id}
          sale={{ subtotal_usd: sale.subtotal_usd, total_usd: sale.total_usd }}
          items={items.map((i) => ({
            line_id: i.line_id,
            product_id: i.product_id,
            product_name: i.product_name,
            size: i.size,
            color: i.color,
            qty: i.qty,
            returned_qty: i.returned_qty,
            unit_price_usd: i.unit_price_usd,
            line_total_usd: i.line_total_usd,
          }))}
        />

        <section className="card space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">{t.sales.statusLabel}</span>
            <Badge tone={statusTone(sale.status)}>{t.sales.status[sale.status]}</Badge>
          </div>
          <Row label={t.receipt.customer}>
            {customer ? (
              <Link href={`/customers/${customer.customer_id}`} className="text-accent-strong underline">
                {customer.name}
              </Link>
            ) : (
              t.sell.walkIn
            )}
          </Row>
          <Row label={t.receipt.subtotal}>{formatUsd(sale.subtotal_usd)}</Row>
          {sale.discount_usd > 0 && <Row label={t.receipt.discount}>−{formatUsd(sale.discount_usd)}</Row>}
          <Row label={t.receipt.total}>
            <strong>{formatUsd(sale.total_usd)}</strong>
            <span className="block text-xs text-muted">{formatLbp(sale.total_lbp)}</span>
          </Row>
          <Row label={t.sales.paid}>
            {[sale.paid_usd > 0 && formatUsd(sale.paid_usd), sale.paid_lbp > 0 && formatLbp(sale.paid_lbp)].filter(Boolean).join(" + ") || "—"}
          </Row>
          {(sale.change_usd > 0 || sale.change_lbp > 0) && (
            <Row label={t.sales.change}>
              {[sale.change_usd > 0 && formatUsd(sale.change_usd), sale.change_lbp > 0 && formatLbp(sale.change_lbp)].filter(Boolean).join(" + ")}
            </Row>
          )}
          <Row label={t.sales.rateUsed}>{formatInt(sale.exchange_rate)}</Row>
          {sale.status !== "completed" && <Row label={t.dashboard.revenue}>{formatUsd(net.revenue)}</Row>}
          <Row label={t.sales.createdBy}>{sale.created_by || "—"}</Row>
          {sale.notes && <p className="border-t border-line pt-3 whitespace-pre-line text-muted">{sale.notes}</p>}
        </section>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
