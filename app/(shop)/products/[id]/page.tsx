import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { formatUsd } from "@/lib/format";
import { bySize, variantLabel } from "@/lib/inventory";
import { getLists, getProduct, getSettings, listMovements, listVariants } from "@/lib/sheets";
import { t } from "@/lib/strings";
import { Thumb } from "../ProductList";
import ArchiveButton from "./ArchiveButton";
import VariantStock from "./VariantStock";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, variants, lists, settings, movements] = await Promise.all([
    getProduct(id),
    listVariants(),
    getLists(),
    getSettings(),
    listMovements(),
  ]);
  if (!product) notFound();

  const own = variants.filter((v) => v.product_id === id).sort(bySize(lists.sizes));
  const labels = new Map(own.map((v) => [v.variant_id, variantLabel(v)]));
  const history = movements
    .filter((m) => labels.has(m.variant_id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  const total = own.reduce((s, v) => s + v.quantity, 0);

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={
          <>
            {product.category || "—"}
            {!product.active && (
              <>
                {" · "}
                <Badge>{t.products.archived}</Badge>
              </>
            )}
          </>
        }
        back="/products"
        action={
          <Link href={`/products/${id}/edit`} className="btn-secondary btn-sm">
            {t.common.edit}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <section className="card space-y-3">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="aspect-square w-full rounded-xl border border-line object-cover" />
          ) : (
            <Thumb url="" name={product.name} size="h-24 w-24" />
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">{t.products.sellPrice}</dt>
            <dd className="text-right font-semibold">{formatUsd(product.sell_price_usd)}</dd>
            <dt className="text-muted">{t.products.costPrice}</dt>
            <dd className="text-right">{formatUsd(product.cost_price_usd)}</dd>
            <dt className="text-muted">{t.products.margin}</dt>
            <dd className="text-right">{formatUsd(product.sell_price_usd - product.cost_price_usd)}</dd>
            <dt className="text-muted">{t.products.totalStock}</dt>
            <dd className="text-right font-semibold">{total}</dd>
          </dl>
          {product.description && <p className="text-sm whitespace-pre-line text-muted">{product.description}</p>}
          <ArchiveButton productId={id} active={product.active} />
        </section>

        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-3 font-semibold">{t.products.stock}</h2>
            <VariantStock variants={own} lowStockDefault={settings.low_stock_default} />
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">{t.products.history}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">{t.products.noHistory}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {history.map((m) => (
                  <li key={m.movement_id} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {labels.get(m.variant_id)} · <span className="capitalize">{m.type}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(m.date)}
                        {m.created_by && ` · ${m.created_by}`}
                        {m.notes && ` · ${m.notes}`}
                      </p>
                      {m.type === "sale" || m.type === "return" ? (
                        <Link href={`/sales/${m.reference_id}`} className="text-xs text-accent-strong underline">
                          {m.reference_id}
                        </Link>
                      ) : null}
                    </div>
                    <span className={`shrink-0 font-semibold ${m.qty_change < 0 ? "text-danger" : "text-success"}`}>
                      {m.qty_change > 0 ? "+" : ""}
                      {m.qty_change}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
