"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeftIcon, MinusIcon, PlusIcon, PrinterIcon } from "@/components/icons";
import { formatUsd } from "@/lib/format";
import { t } from "@/lib/strings";

export type LabelItem = {
  variant_id: string;
  product_id: string;
  name: string;
  variant: string;
  price: number;
  stock: number;
  /** QR code as an SVG string (generated on the server). */
  qr: string;
};

// Standard A4 sticker sheet: 3 × 8 = 24 labels of 70 × 37 mm.
const COLS = 3;
const ROWS = 8;
const PER_SHEET = COLS * ROWS;

export default function LabelSheets({
  items,
  shopName,
  back,
  singleProduct,
}: {
  items: LabelItem[];
  shopName: string;
  back: string;
  singleProduct: string;
}) {
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.variant_id, Math.max(0, i.stock)])),
  );
  const [skip, setSkip] = useState(0);
  const [showPrice, setShowPrice] = useState(true);

  const setAll = (fn: (i: LabelItem) => number) => setQty(Object.fromEntries(items.map((i) => [i.variant_id, fn(i)])));
  const change = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(500, n)) }));

  const labels = useMemo(() => items.flatMap((i) => Array.from({ length: qty[i.variant_id] ?? 0 }, () => i)), [items, qty]);
  const cells: (LabelItem | null)[] = [...Array.from({ length: skip }, () => null), ...labels];
  const sheets: (LabelItem | null)[][] = [];
  for (let s = 0; s < cells.length; s += PER_SHEET) sheets.push(cells.slice(s, s + PER_SHEET));

  return (
    <div className="min-h-dvh px-4 py-5 print:p-0 lg:px-10">
      <style>{`
        @page { size: A4; margin: 0; }
        .label-sheet { width: 210mm; height: 297mm; display: grid; grid-template-columns: repeat(${COLS}, 70mm);
          grid-template-rows: repeat(${ROWS}, 37.125mm); background: #fff; color: #111; overflow: hidden; }
        .label-sheet + .label-sheet { break-before: page; }
        .label-cell { padding: 2.5mm 3mm; display: flex; gap: 2.5mm; align-items: center; overflow: hidden; }
        .label-qr { width: 27mm; height: 27mm; flex-shrink: 0; }
        .label-qr svg { width: 100%; height: 100%; display: block; }
        @media screen { .label-sheet { box-shadow: 0 1px 6px rgb(0 0 0 / .15); margin: 0 auto 16px; }
          .label-cell { outline: 1px dashed #ddd; outline-offset: -1px; } }
        @media print { .label-sheet { margin: 0; } }
      `}</style>

      <div className="no-print mx-auto mb-5 max-w-3xl space-y-4">
        <header className="flex items-center gap-2">
          <Link href={back} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface" aria-label={t.common.back}>
            <ChevronLeftIcon />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-brand text-2xl tracking-wide">{t.labels.title}</h1>
            <p className="text-sm text-muted">{singleProduct || t.labels.allProducts}</p>
          </div>
        </header>

        <section className="card space-y-3 text-sm">
          <p className="text-muted">{t.labels.help}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setAll((i) => Math.max(0, i.stock))}>
              {t.labels.matchStock}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setAll(() => 1)}>
              {t.labels.onePerItem}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setAll(() => 0)}>
              {t.labels.clear}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t.labels.skip}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={PER_SHEET - 1}
                className="input"
                value={skip}
                onChange={(e) => setSkip(Math.max(0, Math.min(PER_SHEET - 1, Math.floor(Number(e.target.value) || 0))))}
              />
            </label>
            <label className="flex items-end gap-2 pb-3">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-strong)]" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
              <span>{t.labels.showPrice}</span>
            </label>
          </div>
        </section>

        {items.length === 0 ? (
          <p className="card text-sm text-muted">{t.labels.none}</p>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {items.map((i) => {
              const n = qty[i.variant_id] ?? 0;
              return (
                <li key={i.variant_id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="text-xs text-muted">
                      {i.variant || "—"} · {t.labels.inStock(i.stock)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-line disabled:opacity-40" onClick={() => change(i.variant_id, n - 1)} disabled={n === 0} aria-label="−1">
                      <MinusIcon width={16} height={16} />
                    </button>
                    <span className="w-8 text-center font-semibold tabular-nums">{n}</span>
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-line" onClick={() => change(i.variant_id, n + 1)} aria-label="+1">
                      <PlusIcon width={16} height={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="sticky bottom-3 z-10">
          <button type="button" className="btn-primary w-full shadow-lg" disabled={labels.length === 0} onClick={() => window.print()}>
            <PrinterIcon width={18} height={18} />
            {t.labels.print(labels.length, sheets.length)}
          </button>
        </div>
        {labels.length > 0 && <p className="text-center text-xs text-muted">{t.labels.printTip}</p>}
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        {sheets.map((sheet, s) => (
          <div key={s} className="label-sheet">
            {Array.from({ length: PER_SHEET }, (_, c) => {
              const item = sheet[c];
              return (
                <div key={c} className="label-cell">
                  {item && (
                    <>
                      <div className="label-qr" dangerouslySetInnerHTML={{ __html: item.qr }} />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-[6.5pt] tracking-[0.18em] uppercase">{shopName}</p>
                        <p className="mt-0.5 line-clamp-2 text-[9pt] font-semibold">{item.name}</p>
                        {item.variant && <p className="text-[8pt]">{item.variant}</p>}
                        {showPrice && <p className="mt-0.5 text-[11pt] font-bold">{formatUsd(item.price)}</p>}
                        <p className="mt-0.5 font-mono text-[5.5pt] text-[#666]">{item.variant_id}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
