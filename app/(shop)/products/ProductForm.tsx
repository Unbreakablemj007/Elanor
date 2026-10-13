"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { ErrorBox } from "@/components/ui";
import { formatUsd, parseNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import { createProduct, saveProduct, type ProductInput } from "./actions";

export type ProductFormValues = {
  product_id?: string;
  name: string;
  category: string;
  description: string;
  cost_price_usd: number;
  sell_price_usd: number;
  image_url: string;
  variants: {
    variant_id?: string;
    size: string;
    color: string;
    quantity: number;
    low_stock_threshold: number | null;
  }[];
};

type VariantRow = {
  key: string;
  variant_id?: string;
  size: string;
  color: string;
  quantity: string;
  threshold: string;
};

let rowCounter = 0;
const rowKey = () => `row-${++rowCounter}`;

export default function ProductForm({
  initial,
  categories,
  sizes,
  colors,
  lowStockDefault,
}: {
  initial?: ProductFormValues;
  categories: string[];
  sizes: string[];
  colors: string[];
  lowStockDefault: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cost, setCost] = useState(initial ? String(initial.cost_price_usd) : "");
  const [price, setPrice] = useState(initial ? String(initial.sell_price_usd) : "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [rows, setRows] = useState<VariantRow[]>(() =>
    initial?.variants.length
      ? initial.variants.map((v) => ({
          key: rowKey(),
          variant_id: v.variant_id,
          size: v.size,
          color: v.color,
          quantity: String(v.quantity),
          threshold: v.low_stock_threshold === null ? "" : String(v.low_stock_threshold),
        }))
      : [{ key: rowKey(), size: sizes[0] ?? "", color: colors[0] ?? "", quantity: "", threshold: "" }],
  );

  const updateRow = (key: string, patch: Partial<VariantRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [
      ...rs,
      { key: rowKey(), size: rs.at(-1)?.size ?? sizes[0] ?? "", color: rs.at(-1)?.color ?? colors[0] ?? "", quantity: "", threshold: "" },
    ]);
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const costN = parseNumber(cost);
  const priceN = parseNumber(price);
  const margin = priceN - costN;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const input: ProductInput = {
      name,
      category,
      description,
      cost_price_usd: costN,
      sell_price_usd: priceN,
      image_url: imageUrl.trim(),
      variants: rows.map((r) => ({
        variant_id: r.variant_id,
        size: r.size,
        color: r.color,
        quantity: Math.trunc(parseNumber(r.quantity)),
        low_stock_threshold: r.threshold.trim() === "" ? null : Math.trunc(parseNumber(r.threshold)),
      })),
    };
    startTransition(async () => {
      const res = initial?.product_id ? await saveProduct(initial.product_id, input) : await createProduct(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/products/${res.data.product_id}`);
      router.refresh();
    });
  }

  // Keep values that exist in the sheet but are no longer in Lists selectable.
  const withCurrent = (list: string[], current: string) => (current && !list.includes(current) ? [current, ...list] : list);

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">
            {t.products.name}
          </label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="category">
            {t.products.category}
          </label>
          <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">—</option>
            {withCurrent(categories, category).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cost">
              {t.products.costPrice}
            </label>
            <input id="cost" className="input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <label className="label" htmlFor="price">
              {t.products.sellPrice}
            </label>
            <input id="price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
          </div>
        </div>
        {priceN > 0 && (
          <p className="text-sm text-muted">
            {t.products.margin}: <span className={margin < 0 ? "text-danger" : "text-ink"}>{formatUsd(margin)}</span>
          </p>
        )}
        <div>
          <label className="label" htmlFor="description">
            {t.products.description} <span className="font-normal">({t.common.optional})</span>
          </label>
          <textarea id="description" className="input min-h-20 py-2" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </div>
        <div>
          <label className="label" htmlFor="image">
            {t.products.imageUrl} <span className="font-normal">({t.common.optional})</span>
          </label>
          <input id="image" className="input" type="url" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">{t.products.variants}</h2>
        {initial?.product_id && <p className="text-xs text-muted">{t.products.newVariantStockNote}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_6rem_8rem_auto] sm:items-end">
              <div>
                <label className="label">{t.common.size}</label>
                <select className="input" value={r.size} onChange={(e) => updateRow(r.key, { size: e.target.value })} required>
                  <option value="">—</option>
                  {withCurrent(sizes, r.size).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t.common.color}</label>
                <select className="input" value={r.color} onChange={(e) => updateRow(r.key, { color: e.target.value })}>
                  <option value="">—</option>
                  {withCurrent(colors, r.color).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t.products.quantity}</label>
                <input
                  className="input disabled:bg-bg disabled:text-muted"
                  inputMode="numeric"
                  value={r.quantity}
                  onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                  placeholder="0"
                  disabled={Boolean(r.variant_id)}
                />
              </div>
              <div>
                <label className="label">{t.products.lowStockThreshold}</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={r.threshold}
                  onChange={(e) => updateRow(r.key, { threshold: e.target.value })}
                  placeholder={t.products.lowStockPlaceholder(lowStockDefault)}
                />
              </div>
              {!r.variant_id && rows.length > 1 ? (
                <button type="button" className="btn-secondary btn-sm col-span-2 text-danger sm:col-span-1" onClick={() => removeRow(r.key)} aria-label={t.common.remove}>
                  <TrashIcon width={18} height={18} />
                  <span className="sm:hidden">{t.common.remove}</span>
                </button>
              ) : (
                <span className="hidden sm:block sm:w-10" />
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn-secondary btn-sm w-full" onClick={addRow}>
          <PlusIcon width={18} height={18} />
          {t.products.addVariant}
        </button>
      </section>

      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
        <button type="submit" className="btn-primary w-full shadow-lg" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </button>
      </div>
    </form>
  );
}
