import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { bySize } from "@/lib/inventory";
import { getLists, getProduct, getSettings, listVariants } from "@/lib/db";
import { t } from "@/lib/strings";
import ProductForm from "../../ProductForm";

export const metadata = { title: t.products.editTitle };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, variants, lists, settings] = await Promise.all([getProduct(id), listVariants(), getLists(), getSettings()]);
  if (!product) notFound();
  const own = variants.filter((v) => v.product_id === id).sort(bySize(lists.sizes));

  return (
    <>
      <PageHeader title={t.products.editTitle} subtitle={product.name} back={`/products/${id}`} />
      <ProductForm
        initial={{
          ...product,
          variants: own.map((v) => ({
            variant_id: v.variant_id,
            size: v.size,
            color: v.color,
            quantity: v.quantity,
            low_stock_threshold: v.low_stock_threshold,
          })),
        }}
        categories={lists.categories}
        sizes={lists.sizes}
        colors={lists.colors}
        lowStockDefault={settings.low_stock_default}
      />
    </>
  );
}
