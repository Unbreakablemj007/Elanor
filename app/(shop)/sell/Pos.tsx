"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MinusIcon, PlusIcon, QrIcon, SearchIcon, TrashIcon, XIcon } from "@/components/icons";
import QrScanner, { type ScanResult } from "@/components/QrScanner";
import { variantIdFromScan } from "@/lib/qr";
import { looksLikeWrongLayout, useScannerInput } from "@/lib/useScannerInput";
import { Modal } from "@/components/Modal";
import { EmptyState, ErrorBox } from "@/components/ui";
import { formatInt, formatLbp, formatUsd, parseNumber, round2 } from "@/lib/format";
import { bySize, variantLabel } from "@/lib/inventory";
import { computeDiscount, computePayment } from "@/lib/payment";
import { t } from "@/lib/strings";
import { createCustomer } from "../customers/actions";
import { createSale } from "./actions";
import { Thumb } from "../products/ProductList";

export type PosProduct = { product_id: string; name: string; category: string; sell_price_usd: number; image_url: string };
export type PosVariant = { variant_id: string; product_id: string; size: string; color: string; quantity: number };
export type PosCustomer = { customer_id: string; name: string; phone: string };

type CartLine = { variant_id: string; qty: number };

export default function Pos({
  products,
  variants,
  customers,
  rate,
  rounding,
  sizes,
  categories,
}: {
  products: PosProduct[];
  variants: PosVariant[];
  customers: PosCustomer[];
  rate: number;
  rounding: number;
  sizes: string[];
  categories: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null); // null = All
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [extraCustomers, setExtraCustomers] = useState<PosCustomer[]>([]);
  const [discountType, setDiscountType] = useState<"usd" | "pct">("usd");
  const [discountValue, setDiscountValue] = useState("");
  const [paidUsd, setPaidUsd] = useState("");
  const [paidLbp, setPaidLbp] = useState("");
  const [changeIn, setChangeIn] = useState<"usd" | "lbp">("usd");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<ScanResult | null>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.product_id, p])), [products]);
  const variantById = useMemo(() => new Map(variants.map((v) => [v.variant_id, v])), [variants]);
  const stockByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variants) m.set(v.product_id, (m.get(v.product_id) ?? 0) + v.quantity);
    return m;
  }, [variants]);

  const inCart = (variant_id: string) => cart.find((l) => l.variant_id === variant_id)?.qty ?? 0;

  // Cart lines are resolved against the latest props, so a refresh after a
  // price/stock change updates the totals without losing the cart.
  const lines = cart
    .map((l) => {
      const v = variantById.get(l.variant_id);
      const p = v && productById.get(v.product_id);
      return v && p ? { ...l, variant: v, product: p, total: round2(p.sell_price_usd * l.qty) } : null;
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
  const discount = computeDiscount(subtotal, { type: discountType, value: parseNumber(discountValue) });
  const total = round2(subtotal - discount);
  const pUsd = parseNumber(paidUsd);
  const pLbp = parseNumber(paidLbp);
  const payment = computePayment({ totalUsd: total, rate, rounding, paidUsd: pUsd, paidLbp: pLbp });
  const hasPayment = pUsd > 0 || pLbp > 0;
  const canConfirm = lines.length > 0 && payment.sufficient && (hasPayment || total === 0) && !pending;

  // Category tabs: the shop's list order first, then any category only found on
  // products; "Other" collects products with no category. Empty tabs are hidden.
  const categoryOf = (p: PosProduct) => p.category.trim() || t.sell.otherCategory;
  const categoryTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(categoryOf(p), (counts.get(categoryOf(p)) ?? 0) + 1);
    const order = [...categories, ...[...counts.keys()].filter((c) => !categories.includes(c)).sort()];
    return order.filter((c) => counts.has(c)).map((c) => ({ name: c, count: counts.get(c) ?? 0 }));
  }, [products, categories]);

  const q = query.trim().toLowerCase();
  // Every product is listed (no cap). Typing searches all categories.
  const results = useMemo(() => {
    return products
      .filter((p) =>
        q ? p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) : !category || categoryOf(p) === category,
      )
      .sort((a, b) => {
        const sa = (stockByProduct.get(a.product_id) ?? 0) > 0 ? 0 : 1;
        const sb = (stockByProduct.get(b.product_id) ?? 0) > 0 ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [products, q, category, stockByProduct]);

  const pickCategory = (c: string | null) => {
    setCategory(c);
    setQuery("");
  };

  function addToCart(variant_id: string, qty: number) {
    setCart((c) => {
      const existing = c.find((l) => l.variant_id === variant_id);
      if (existing) return c.map((l) => (l.variant_id === variant_id ? { ...l, qty: l.qty + qty } : l));
      return [...c, { variant_id, qty }];
    });
    setPicking(null);
    setQuery("");
    setError("");
  }

  /** A scanned label adds one piece of that size/colour to the cart. */
  function onScan(text: string): ScanResult {
    const id = variantIdFromScan(text);
    if (!id) return { ok: false, message: looksLikeWrongLayout(text) ? t.scan.wrongLayout : t.scan.unknown };
    const v = variantById.get(id);
    const p = v && productById.get(v.product_id);
    if (!v || !p) return { ok: false, message: t.scan.notFound };
    const label = [p.name, variantLabel(v)].filter(Boolean).join(" ");
    if (inCart(id) + 1 > v.quantity) return { ok: false, message: t.scan.noStock(label) };
    addToCart(id, 1);
    return { ok: true, message: t.scan.added(label) };
  }

  // USB / Bluetooth scanner (types the code + Enter). Paused while the camera scanner is open.
  const showScan = (text: string) => {
    const result = onScan(text);
    setScanNotice(result);
    navigator.vibrate?.(result.ok ? 80 : [60, 60, 60]);
  };
  useScannerInput(showScan, !scanning);
  useEffect(() => {
    if (!scanNotice) return;
    const timer = window.setTimeout(() => setScanNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [scanNotice]);

  function setQty(variant_id: string, qty: number) {
    const max = variantById.get(variant_id)?.quantity ?? 0;
    const next = Math.min(Math.max(qty, 0), max);
    setCart((c) => (next === 0 ? c.filter((l) => l.variant_id !== variant_id) : c.map((l) => (l.variant_id === variant_id ? { ...l, qty: next } : l))));
  }

  function confirm() {
    setError("");
    startTransition(async () => {
      const res = await createSale({
        items: cart,
        customer_id: customer?.customer_id ?? "",
        discount: { type: discountType, value: parseNumber(discountValue) },
        paid_usd: pUsd,
        paid_lbp: pLbp,
        change_in: changeIn,
        notes,
        expected_total_usd: total,
        expected_rate: rate,
      });
      if (!res.ok) {
        setError(res.error);
        // Pull fresh stock/prices/rate; the cart is kept.
        router.refresh();
        return;
      }
      router.push(`/sales/${res.data.sale_id}/receipt`);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-start">
      {/* Product search */}
      <section className="min-w-0 space-y-3">
        <div className="flex gap-2">
        <label className="relative block flex-1">
          <span className="sr-only">{t.common.search}</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input pl-10 text-lg"
            placeholder={t.sell.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            onKeyDown={(e) => {
              // A scanner used while the search box is focused types the label + Enter here.
              if (e.key !== "Enter" && e.key !== "Tab") return;
              if (variantIdFromScan(query) || (query.length > 12 && looksLikeWrongLayout(query))) {
                e.preventDefault();
                showScan(query);
                setQuery("");
              }
            }}
          />
        </label>
          <button type="button" className="btn-secondary shrink-0 px-4" onClick={() => setScanning(true)}>
            <QrIcon />
            {t.scan.button}
          </button>
        </div>
        <QrScanner open={scanning} onClose={() => setScanning(false)} onScan={onScan} />
        {scanNotice && (
          <p role="status" className={`rounded-xl px-3 py-2 text-sm font-medium ${scanNotice.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {scanNotice.message}
          </p>
        )}
        {categoryTabs.length > 1 && (
          <nav aria-label={t.sell.categories} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2 pb-1 sm:flex-wrap">
              {[{ name: null as string | null, label: t.common.all, count: products.length }, ...categoryTabs.map((c) => ({ ...c, label: c.name }))].map((c) => {
                const active = !q && category === c.name;
                return (
                  <li key={c.name ?? "__all"} className="shrink-0">
                    <button type="button" className={`chip gap-1.5 whitespace-nowrap ${active ? "chip-active" : ""}`} aria-pressed={active} onClick={() => pickCategory(c.name)}>
                      {c.label}
                      <span className={`text-xs ${active ? "opacity-80" : "text-muted"}`}>{c.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        {q && <p className="text-xs text-muted">{t.sell.searchingAll(query.trim())}</p>}
        {results.length === 0 ? (
          <EmptyState>{q || !category ? t.sell.noProducts : t.sell.noProductsInCategory}</EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((p) => {
              const stock = stockByProduct.get(p.product_id) ?? 0;
              return (
                <li key={p.product_id}>
                  <button
                    type="button"
                    onClick={() => setPicking(p)}
                    disabled={stock === 0}
                    className="card flex h-full w-full flex-col gap-2 p-3 text-left transition hover:border-accent disabled:opacity-50"
                  >
                    <Thumb url={p.image_url} name={p.name} size="h-12 w-12" />
                    <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                    <span className="mt-auto flex w-full items-center justify-between text-sm">
                      <strong>{formatUsd(p.sell_price_usd)}</strong>
                      <span className="text-xs text-muted">{stock}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Cart + checkout */}
      <div className="space-y-4 lg:sticky lg:top-6">
        <section className="card">
          <h2 className="mb-2 font-semibold">{t.sell.cart}</h2>
          {lines.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">{t.sell.cartEmpty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.variant_id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.product.name}</p>
                      <p className="text-xs text-muted">
                        {variantLabel(l.variant)} · {formatUsd(l.product.sell_price_usd)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatUsd(l.total)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Stepper value={l.qty} max={l.variant.quantity} onChange={(q) => setQty(l.variant_id, q)} />
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-danger hover:bg-danger/10" onClick={() => setQty(l.variant_id, 0)} aria-label={t.common.remove}>
                      <TrashIcon width={18} height={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <CustomerPicker
          customers={[...extraCustomers, ...customers]}
          selected={customer}
          onSelect={setCustomer}
          onCreated={(c) => {
            setExtraCustomers((cs) => [c, ...cs]);
            setCustomer(c);
          }}
        />

        <section className="card space-y-4">
          <div>
            <span className="label">{t.sell.discount}</span>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-line p-1">
                {(["usd", "pct"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`min-h-10 w-11 rounded-lg text-sm font-medium ${discountType === type ? "bg-accent-strong text-on-accent" : ""}`}
                    onClick={() => setDiscountType(type)}
                  >
                    {type === "usd" ? t.sell.discountUsd : t.sell.discountPct}
                  </button>
                ))}
              </div>
              <input className="input" inputMode="decimal" placeholder="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} aria-label={t.sell.discount} />
            </div>
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.sell.subtotal}</dt>
              <dd>{formatUsd(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">{t.sell.discount}</dt>
                <dd>−{formatUsd(discount)}</dd>
              </div>
            )}
            <div className="flex items-end justify-between border-t border-line pt-2">
              <dt className="font-semibold">{t.sell.total}</dt>
              <dd className="text-right">
                <span className="block text-2xl font-semibold">{formatUsd(total)}</span>
                <span className="block text-sm text-muted">{formatLbp(payment.totalLbp)}</span>
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">{t.sell.rate(formatInt(rate))}</p>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">{t.sell.payment}</h2>
          <MoneyField label={t.sell.paidUsd} value={paidUsd} onChange={setPaidUsd} prefix="$" quickLabel={t.sell.exactUsd} onQuick={() => { setPaidUsd(total.toFixed(2)); setPaidLbp(""); }} />
          <MoneyField
            label={t.sell.paidLbp}
            value={paidLbp}
            onChange={setPaidLbp}
            prefix="LBP"
            quickLabel={t.sell.exactLbp}
            onQuick={() => { setPaidLbp(String(payment.totalLbp)); setPaidUsd(""); }}
            hint={pLbp > 0 ? formatLbp(pLbp) : undefined}
          />

          {hasPayment && lines.length > 0 && (
            payment.sufficient ? (
              <div className="rounded-xl bg-success/10 p-3">
                <p className="text-sm text-success">{t.sell.change}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["usd", "lbp"] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setChangeIn(cur)}
                      className={`rounded-xl border p-2 text-left ${changeIn === cur ? "border-success bg-surface ring-2 ring-success/30" : "border-transparent"}`}
                      aria-pressed={changeIn === cur}
                    >
                      <span className="block text-lg font-semibold">{cur === "usd" ? formatUsd(payment.changeUsd) : formatLbp(payment.changeLbp)}</span>
                      <span className="text-xs text-muted">{t.sell.giveChangeIn} {cur.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                {t.sell.remaining}: <strong>{formatUsd(payment.remainingUsd)}</strong> / {formatLbp(payment.remainingLbp)}
              </div>
            )
          )}

          <div>
            <label className="label" htmlFor="sale-notes">
              {t.sell.notes} <span className="font-normal">({t.common.optional})</span>
            </label>
            <input id="sale-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}
        </section>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 lg:static">
          <button type="button" className="btn-primary w-full text-lg shadow-lg" disabled={!canConfirm} onClick={confirm}>
            {pending ? t.sell.confirming : `${t.sell.confirm} · ${formatUsd(total)}`}
          </button>
        </div>
      </div>

      <VariantPicker
        product={picking}
        variants={picking ? variants.filter((v) => v.product_id === picking.product_id).sort(bySize(sizes)) : []}
        inCart={inCart}
        onClose={() => setPicking(null)}
        onAdd={addToCart}
      />
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-line" onClick={() => onChange(value - 1)} aria-label="−1">
        <MinusIcon width={18} height={18} />
      </button>
      <span className="w-10 text-center text-lg font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line disabled:opacity-40"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="+1"
      >
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  prefix,
  quickLabel,
  onQuick,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix: string;
  quickLabel: string;
  onQuick: () => void;
  hint?: string;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">{prefix}</span>
          <input
            className={`input text-lg ${prefix.length > 1 ? "pl-12" : "pl-7"}`}
            inputMode="decimal"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
          />
        </label>
        <button type="button" className="btn-secondary btn-sm shrink-0" onClick={onQuick}>
          {quickLabel}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function VariantPicker({
  product,
  variants,
  inCart,
  onClose,
  onAdd,
}: {
  product: PosProduct | null;
  variants: PosVariant[];
  inCart: (variant_id: string) => number;
  onClose: () => void;
  onAdd: (variant_id: string, qty: number) => void;
}) {
  return (
    <Modal open={product !== null} onClose={onClose} title={product?.name ?? ""}>
      {product && <VariantPickerBody key={product.product_id} product={product} variants={variants} inCart={inCart} onAdd={onAdd} />}
    </Modal>
  );
}

function VariantPickerBody({
  product,
  variants,
  inCart,
  onAdd,
}: {
  product: PosProduct;
  variants: PosVariant[];
  inCart: (variant_id: string) => number;
  onAdd: (variant_id: string, qty: number) => void;
}) {
  const available = (v: PosVariant) => v.quantity - inCart(v.variant_id);
  const sizeList = [...new Set(variants.map((v) => v.size))];
  const firstInStock = variants.find((v) => available(v) > 0);
  const [size, setSize] = useState(firstInStock?.size ?? sizeList[0] ?? "");
  const colorsForSize = variants.filter((v) => v.size === size);
  const [variantId, setVariantId] = useState(
    (colorsForSize.find((v) => available(v) > 0) ?? colorsForSize[0])?.variant_id ?? "",
  );
  const [qty, setQty] = useState(1);

  const variant = variants.find((v) => v.variant_id === variantId && v.size === size);
  const left = variant ? available(variant) : 0;

  const pickSize = (s: string) => {
    setSize(s);
    const options = variants.filter((v) => v.size === s);
    setVariantId((options.find((v) => available(v) > 0) ?? options[0])?.variant_id ?? "");
    setQty(1);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold">{formatUsd(product.sell_price_usd)}</p>
      <div>
        <span className="label">{t.sell.pickSize}</span>
        <div className="flex flex-wrap gap-2">
          {sizeList.map((s) => {
            const stock = variants.filter((v) => v.size === s).reduce((n, v) => n + available(v), 0);
            return (
              <button key={s} type="button" className={`chip ${s === size ? "chip-active" : ""} ${stock <= 0 ? "opacity-40" : ""}`} onClick={() => pickSize(s)}>
                {s}
              </button>
            );
          })}
        </div>
      </div>
      {colorsForSize.some((v) => v.color) && (
        <div>
          <span className="label">{t.sell.pickColor}</span>
          <div className="flex flex-wrap gap-2">
            {colorsForSize.map((v) => (
              <button
                key={v.variant_id}
                type="button"
                className={`chip ${v.variant_id === variantId ? "chip-active" : ""} ${available(v) <= 0 ? "opacity-40" : ""}`}
                onClick={() => {
                  setVariantId(v.variant_id);
                  setQty(1);
                }}
              >
                {v.color || "—"}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-sm ${left > 0 ? "text-muted" : "text-danger"}`}>{left > 0 ? t.sell.inStock(left) : t.sell.maxReached}</span>
        <Stepper value={qty} max={left} onChange={(n) => setQty(Math.max(1, Math.min(n, left)))} />
      </div>
      <button type="button" className="btn-primary w-full" disabled={!variant || left < 1 || qty > left} onClick={() => variant && onAdd(variant.variant_id, qty)}>
        {t.sell.addToCart} · {formatUsd(product.sell_price_usd * qty)}
      </button>
    </div>
  );
}

function CustomerPicker({
  customers,
  selected,
  onSelect,
  onCreated,
}: {
  customers: PosCustomer[];
  selected: PosCustomer | null;
  onSelect: (c: PosCustomer | null) => void;
  onCreated: (c: PosCustomer) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const matches = q
    ? customers.filter((c) => c.name.toLowerCase().includes(q) || (digits && c.phone.replace(/\D/g, "").includes(digits))).slice(0, 6)
    : [];

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await createCustomer({ name, phone, notes: "" });
      if (!res.ok) return setError(res.error);
      onCreated({ customer_id: res.data.customer_id, name: res.data.name, phone: res.data.phone });
      setAdding(false);
      setName("");
      setPhone("");
      setQuery("");
    });
  }

  return (
    <section className="card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">
          {t.sell.customer} <span className="text-sm font-normal text-muted">({t.common.optional})</span>
        </h2>
        {!selected && (
          <button
            type="button"
            className="text-sm font-medium text-accent-strong"
            onClick={() => {
              setName(/\d/.test(query) ? "" : query);
              setPhone(/\d/.test(query) ? query : "");
              setAdding(true);
            }}
          >
            + {t.sell.quickAdd}
          </button>
        )}
      </div>
      {selected ? (
        <div className="flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2">
          <div>
            <p className="font-medium">{selected.name}</p>
            {selected.phone && <p className="text-xs text-muted">{selected.phone}</p>}
          </div>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full" onClick={() => onSelect(null)} aria-label={t.common.remove}>
            <XIcon width={18} height={18} />
          </button>
        </div>
      ) : (
        <>
          <input type="search" className="input" placeholder={t.sell.customerSearch} value={query} onChange={(e) => setQuery(e.target.value)} />
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {matches.map((c) => (
                <li key={c.customer_id}>
                  <button type="button" className="flex min-h-12 w-full items-center justify-between px-3 text-left" onClick={() => { onSelect(c); setQuery(""); }}>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!q && <p className="mt-2 text-xs text-muted">{t.sell.walkIn}</p>}
        </>
      )}

      <Modal open={adding} onClose={() => !pending && setAdding(false)} title={t.sell.quickAddTitle}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="qa-name">
              {t.customers.name}
            </label>
            <input id="qa-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="qa-phone">
              {t.customers.phone} <span className="font-normal">({t.common.optional})</span>
            </label>
            <input id="qa-phone" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? t.common.saving : t.sell.quickAddSave}
          </button>
        </form>
      </Modal>
    </section>
  );
}
