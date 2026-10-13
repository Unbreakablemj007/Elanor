import Link from "next/link";
import { PlusIcon, PrinterIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { getLists, getSettings, listProducts, listVariants } from "@/lib/db";
import { t } from "@/lib/strings";
import ProductList from "./ProductList";
import ScanToOpen from "./ScanToOpen";

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
          <div className="flex flex-wrap justify-end gap-2">
            <ScanToOpen />
            <Link href="/labels" className="btn-secondary btn-sm">
              <PrinterIcon width={18} height={18} />
              {t.labels.open}
            </Link>
            <Link href="/products/new" className="btn-primary btn-sm">
              <PlusIcon width={18} height={18} />
              {t.products.new}
            </Link>
          </div>
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
