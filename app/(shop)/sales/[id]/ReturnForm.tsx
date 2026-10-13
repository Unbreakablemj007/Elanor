"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/Modal";
import { ErrorBox } from "@/components/ui";
import { formatUsd } from "@/lib/format";
import { variantLabel } from "@/lib/inventory";
import { refundValue } from "@/lib/reports";
import { t } from "@/lib/strings";
import { returnItems } from "../actions";

type Item = {
  line_id: string;
  product_id: string;
  product_name: string;
  size: string;
  color: string;
  qty: number;
  returned_qty: number;
  unit_price_usd: number;
  line_total_usd: number;
};

export default function ReturnForm({
  saleId,
  sale,
  items,
}: {
  saleId: string;
  sale: { subtotal_usd: number; total_usd: number };
  items: Item[];
}) {
  const router = useRouter();
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = items
    .map((i) => ({ ...i, ret: qtys[i.line_id] ?? 0 }))
    .filter((i) => i.ret > 0);
  const count = selected.reduce((n, i) => n + i.ret, 0);
  const refund = refundValue(sale, selected.map((i) => ({ qty: i.ret, unit_price_usd: i.unit_price_usd })));
  const anyReturnable = items.some((i) => i.qty > i.returned_qty);

  const set = (line_id: string, value: number, max: number) =>
    setQtys((q) => ({ ...q, [line_id]: Math.max(0, Math.min(value, max)) }));

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await returnItems({ sale_id: saleId, lines: selected.map((i) => ({ line_id: i.line_id, qty: i.ret })) });
      setConfirming(false);
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      setQtys({});
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2 className="mb-2 font-semibold">{t.sales.items}</h2>
      <ul className="divide-y divide-line">
        {items.map((i) => {
          const max = i.qty - i.returned_qty;
          const ret = qtys[i.line_id] ?? 0;
          return (
            <li key={i.line_id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${i.product_id}`} className="font-medium hover:underline">
                    {i.product_name}
                  </Link>
                  <p className="text-xs text-muted">
                    {variantLabel(i)} · {i.qty} × {formatUsd(i.unit_price_usd)}
                    {i.returned_qty > 0 && <span className="text-danger"> · {t.sales.returned(i.returned_qty)}</span>}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{formatUsd(i.line_total_usd)}</p>
              </div>
              {max > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {t.sales.returnQty} ({t.sales.returnable(max)})
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-line disabled:opacity-40" onClick={() => set(i.line_id, ret - 1, max)} disabled={ret === 0} aria-label="−1">
                      <MinusIcon width={16} height={16} />
                    </button>
                    <span className="w-8 text-center font-semibold tabular-nums">{ret}</span>
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-line disabled:opacity-40" onClick={() => set(i.line_id, ret + 1, max)} disabled={ret >= max} aria-label="+1">
                      <PlusIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {anyReturnable && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {count > 0 && (
            <p className="flex justify-between text-sm">
              <span className="text-muted">{t.sales.refundValue}</span>
              <strong>{formatUsd(refund)}</strong>
            </p>
          )}
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="button" className="btn-secondary w-full" disabled={count === 0 || pending} onClick={() => setConfirming(true)}>
            {t.sales.returnSubmit}
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={t.sales.returnItems}
        message={
          <>
            <p>{t.sales.returnConfirm(count)}</p>
            <p className="mt-2 text-muted">
              {t.sales.refundValue}: <strong className="text-ink">{formatUsd(refund)}</strong>
            </p>
          </>
        }
        danger
        busy={pending}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
