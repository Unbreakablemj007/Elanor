import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { getLists, getSettings, listProducts, listVariants } from "@/lib/sheets";
import { t } from "@/lib/strings";
import ProductList from "./ProductList";

export const metadata = { title: t.products.title };

export default async function ProductsPage() {
  const [products, variants, lists, settings] = await Promise.all([
    listProducts(),
    listVariants(),
    getLists(),
    getSettings(),
  ]);
  const categories = [...new Set([...lists.categories, ...products.map((p) => p.category).filter(Boolean)])];

  return (
    <>
      <PageHeader
        title={t.products.title}
        action={
          <Link href="/products/new" className="btn-primary btn-sm">
            <PlusIcon width={18} height={18} />
            {t.products.new}
          </Link>
        }
      />
      <ProductList
        products={products}
        variants={variants}
        categories={categories}
        sizes={lists.sizes}
        lowStockDefault={settings.low_stock_default}
      />
    </>
  );
}
