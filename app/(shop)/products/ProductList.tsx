"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Badge, EmptyState } from "@/components/ui";
import { formatUsd } from "@/lib/format";
import { isLowStock, stockBySize, type StockVariant } from "@/lib/inventory";
import type { Product } from "@/lib/db/products";
import { t } from "@/lib/strings";

export default function ProductList({
  products,
  variants,
  categories,
  sizes,
  lowStockDefault,
}: {
  products: Product[];
  variants: StockVariant[];
  categories: string[];
  sizes: string[];
  lowStockDefault: number;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, StockVariant[]>();
    for (const v of variants) map.set(v.product_id, [...(map.get(v.product_id) ?? []), v]);
    return map;
  }, [variants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (showArchived ? !p.active : p.active))
      .filter((p) => !category || p.category === category)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, query, category, showArchived]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t.common.search}</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input pl-10"
            placeholder={t.products.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t.products.category}>
          <option value="">{t.products.allCategories}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" className="h-5 w-5 accent-accent-strong" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        {t.products.showArchived}
      </label>

      {filtered.length === 0 ? (
        <EmptyState
          action={
            products.length === 0 ? (
              <Link href="/products/new" className="btn-primary btn-sm">
                {t.products.new}
              </Link>
            ) : undefined
          }
        >
          {products.length === 0 ? t.products.empty : t.products.emptyFiltered}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => {
            const pv = variantsByProduct.get(p.product_id) ?? [];
            const total = pv.reduce((s, v) => s + v.quantity, 0);
            const low = pv.some((v) => isLowStock(v, lowStockDefault));
            return (
              <li key={p.product_id}>
                <Link href={`/products/${p.product_id}`} className="card flex gap-3 transition hover:border-accent">
                  <Thumb url={p.image_url} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="shrink-0 font-semibold">{formatUsd(p.sell_price_usd)}</p>
                    </div>
                    <p className="mb-2 text-xs text-muted">
                      {p.category || "—"}
                      {!p.active && (
                        <>
                          {" · "}
                          <Badge>{t.products.archived}</Badge>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge tone={total === 0 ? "danger" : low ? "warning" : "success"}>
                        {total === 0 ? t.products.outOfStock : `${t.products.totalStock}: ${total}`}
                      </Badge>
                      {stockBySize(pv, sizes).map(([size, q]) => (
                        <span key={size} className={`rounded-md border border-line px-1.5 py-0.5 ${q === 0 ? "text-muted line-through" : ""}`}>
                          {size} {q}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Thumb({ url, name, size = "h-16 w-16" }: { url: string; name: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-xl border border-line object-cover`} loading="lazy" />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-accent-soft font-brand text-xl text-accent-strong`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
