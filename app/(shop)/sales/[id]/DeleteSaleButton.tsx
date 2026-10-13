"use client";

import { useState, useTransition } from "react";
import { TrashIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/Modal";
import { ErrorBox } from "@/components/ui";
import { t } from "@/lib/strings";
import { deleteSale } from "../actions";

export default function DeleteSaleButton({ saleId, unreturned }: { saleId: string; unreturned: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      setError("");
      // On success the action redirects to /sales.
      const res = await deleteSale(saleId);
      if (res && !res.ok) setError(res.error);
      setOpen(false);
    });

  return (
    <>
      <button type="button" className="btn-secondary btn-sm w-full text-danger" onClick={() => setOpen(true)}>
        <TrashIcon width={18} height={18} />
        {t.sales.deleteSale}
      </button>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ConfirmDialog
        open={open}
        title={t.sales.deleteTitle}
        message={
          <>
            <p>{t.sales.deleteConfirm(saleId)}</p>
            {unreturned > 0 && <p className="mt-2 text-muted">{t.sales.deleteRestock(unreturned)}</p>}
          </>
        }
        confirmLabel={t.sales.deleteConfirmLabel}
        danger
        busy={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
