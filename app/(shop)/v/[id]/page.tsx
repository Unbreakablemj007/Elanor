import { notFound, redirect } from "next/navigation";
import { listVariants } from "@/lib/db";
import { variantIdFromScan } from "@/lib/qr";

/** Target of the link inside each QR label: opens that item's product page. */
export default async function VariantLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const variantId = variantIdFromScan(decodeURIComponent(id));
  const variant = variantId ? (await listVariants()).find((v) => v.variant_id === variantId) : undefined;
  if (!variant) notFound();
  redirect(`/products/${variant.product_id}`);
}
