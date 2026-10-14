import { PageHeader } from "@/components/ui";
import { getLists, getSettings, listCustomers, listProducts, listVariants } from "@/lib/db";
import { t } from "@/lib/strings";
import Pos from "./Pos";

export const metadata = { title: t.sell.title };

export default async function SellPage() {
  const [products, variants, customers, settings, lists] = await Promise.all([
    listProducts(),
    listVariants(),
    listCustomers(),
    getSettings(),
    getLists(),
  ]);
  const active = products.filter((p) => p.active);
  const activeIds = new Set(active.map((p) => p.product_id));

  return (
    <>
      <PageHeader title={t.sell.title} />
      <Pos
        products={active.map((p) => ({
          product_id: p.product_id,
          name: p.name,
          category: p.category,
          sell_price_usd: p.sell_price_usd,
          image_url: p.image_url,
        }))}
        variants={variants
          .filter((v) => activeIds.has(v.product_id))
          .map((v) => ({ variant_id: v.variant_id, product_id: v.product_id, size: v.size, color: v.color, quantity: v.quantity }))}
        customers={customers.map((c) => ({ customer_id: c.customer_id, name: c.name, phone: c.phone }))}
        rate={settings.exchange_rate_lbp_per_usd}
        rounding={settings.lbp_rounding}
        sizes={lists.sizes}
        categories={lists.categories}
      />
    </>
  );
}
