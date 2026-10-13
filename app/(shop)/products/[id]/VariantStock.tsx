"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { Badge, ErrorBox } from "@/components/ui";
import { parseNumber } from "@/lib/format";
import { isLowStock, thresholdOf, variantLabel, type StockVariant } from "@/lib/inventory";
import { t } from "@/lib/strings";
import { adjustVariant, restockVariant } from "../actions";

type Mode = { kind: "restock" | "adjust"; variant: StockVariant } | null;

export default function VariantStock({ variants, lowStockDefault }: { variants: StockVariant[]; lowStockDefault: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const open = (kind: "restock" | "adjust", variant: StockVariant) => {
    setMode({ kind, variant });
    setAmount("");
    setNotes("");
    setError("");
  };
  const close = () => {
    if (pending) return;
    setMode(null);
    setConfirming(false);
  };

  const n = Math.trunc(parseNumber(amount));

  function run() {
    if (!mode) return;
    setError("");
    startTransition(async () => {
      const res =
        mode.kind === "restock"
          ? await restockVariant({ variant_id: mode.variant.variant_id, qty: n, notes })
          : await adjustVariant({ variant_id: mode.variant.variant_id, change: n, notes });
      setConfirming(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMode(null);
      router.refresh();
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode) return;
    if (mode.kind === "adjust") {
      if (!notes.trim()) return setError(t.products.adjustNoteRequired);
      if (n === 0) return;
      setConfirming(true);
    } else {
      if (n < 1) return;
      run();
    }
  }

  if (variants.length === 0) return <p className="text-sm text-muted">—</p>;

  return (
    <>
      <ul className="divide-y divide-line">
        {variants.map((v) => {
          const low = isLowStock(v, lowStockDefault);
          return (
            <li key={v.variant_id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{variantLabel(v)}</p>
                <p className="text-xs text-muted">
                  {t.products.lowStockThreshold}: {thresholdOf(v, lowStockDefault)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">{v.quantity}</span>
                {v.quantity === 0 ? (
                  <Badge tone="danger">{t.products.outOfStock}</Badge>
                ) : low ? (
                  <Badge tone="warning">{t.products.low}</Badge>
                ) : null}
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <button type="button" className="btn-primary btn-sm flex-1" onClick={() => open("restock", v)}>
                  {t.products.restock}
                </button>
                <button type="button" className="btn-secondary btn-sm flex-1" onClick={() => open("adjust", v)}>
                  {t.products.adjust}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={mode !== null && !confirming}
        onClose={close}
        title={mode ? `${mode.kind === "restock" ? t.products.restockTitle : t.products.adjustTitle} · ${variantLabel(mode.variant)}` : ""}
      >
        {mode && (
          <form onSubmit={submit} className="space-y-4">
            {mode.kind === "adjust" && <p className="text-sm text-muted">{t.products.adjustHelp}</p>}
            <p className="text-sm">
              {t.products.stock}: <strong>{mode.variant.quantity}</strong>
            </p>
            <div>
              <label className="label" htmlFor="amount">
                {mode.kind === "restock" ? t.products.restockQty : t.products.adjustQty}
              </label>
              <input
                id="amount"
                className="input text-lg"
                inputMode={mode.kind === "restock" ? "numeric" : "text"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={mode.kind === "restock" ? "1" : "-1"}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="notes">
                {t.common.notes} {mode.kind === "restock" && <span className="font-normal">({t.common.optional})</span>}
              </label>
              <input id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} required={mode.kind === "adjust"} maxLength={500} />
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button type="submit" className="btn-primary w-full" disabled={pending || (mode.kind === "restock" ? n < 1 : n === 0)}>
              {pending ? t.common.saving : mode.kind === "restock" ? t.products.restock : t.products.adjust}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={confirming && mode !== null}
        title={t.products.adjustTitle}
        message={mode ? t.products.adjustConfirm(variantLabel(mode.variant), n, mode.variant.quantity + n) : ""}
        danger={n < 0}
        busy={pending}
        onConfirm={run}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
