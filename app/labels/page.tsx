import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth/current";
import { getLists, getSettings, listProducts, listVariants } from "@/lib/db";
import { bySize, variantLabel } from "@/lib/inventory";
import { variantQrPayload } from "@/lib/qr";
import { t } from "@/lib/strings";
import { requestOrigin } from "@/lib/url";
import LabelSheets, { type LabelItem } from "./LabelSheets";

export const metadata: Metadata = { title: t.labels.title };

/** Printable QR labels (A4 sticker sheets) for one product or the whole shop. */
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  await requireUser();
  const { product: productId } = await searchParams;
  const [products, variants, settings, lists, origin] = await Promise.all([
    listProducts(),
    listVariants(),
    getSettings(),
    getLists(),
    requestOrigin(),
  ]);

  const shown = products.filter((p) => (productId ? p.product_id === productId : p.active));
  const byId = new Map(shown.map((p) => [p.product_id, p]));
  const sortSize = bySize(lists.sizes);
  const own = variants
    .filter((v) => byId.has(v.product_id))
    .sort((a, b) => byId.get(a.product_id)!.name.localeCompare(byId.get(b.product_id)!.name) || sortSize(a, b));

  const items: LabelItem[] = await Promise.all(
    own.map(async (v) => {
      const p = byId.get(v.product_id)!;
      return {
        variant_id: v.variant_id,
        product_id: p.product_id,
        name: p.name,
        variant: variantLabel(v),
        price: p.sell_price_usd,
        stock: v.quantity,
        qr: await QRCode.toString(variantQrPayload(origin, v.variant_id), {
          type: "svg",
          margin: 0,
          errorCorrectionLevel: "M",
        }),
      };
    }),
  );

  return (
    <LabelSheets
      items={items}
      shopName={settings.shop_name}
      back={productId ? `/products/${productId}` : "/products"}
      singleProduct={productId ? (byId.get(productId)?.name ?? "") : ""}
    />
  );
}
