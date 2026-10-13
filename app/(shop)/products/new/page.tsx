import { PageHeader } from "@/components/ui";
import { getLists, getSettings } from "@/lib/db";
import { t } from "@/lib/strings";
import ProductForm from "../ProductForm";

export const metadata = { title: t.products.new };

export default async function NewProductPage() {
  const [lists, settings] = await Promise.all([getLists(), getSettings()]);
  return (
    <>
      <PageHeader title={t.products.new} back="/products" />
      <ProductForm categories={lists.categories} sizes={lists.sizes} colors={lists.colors} lowStockDefault={settings.low_stock_default} />
    </>
  );
}
