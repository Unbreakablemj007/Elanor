"use client";

import { useState, useTransition } from "react";
import { TrashIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/Modal";
import { ErrorBox } from "@/components/ui";
import { t } from "@/lib/strings";
import { deleteCustomer } from "../actions";

export default function DeleteCustomerButton({ customerId, name, sales }: { customerId: string; name: string; sales: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      setError("");
      // On success the action redirects to /customers.
      const res = await deleteCustomer(customerId);
      if (res && !res.ok) setError(res.error);
      setOpen(false);
    });

  return (
    <>
      <button type="button" className="btn-secondary btn-sm w-full text-danger" onClick={() => setOpen(true)}>
        <TrashIcon width={18} height={18} />
        {t.customers.delete}
      </button>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ConfirmDialog
        open={open}
        title={t.customers.deleteTitle}
        message={
          <>
            <p>{t.customers.deleteConfirm(name)}</p>
            {sales > 0 && <p className="mt-2 text-muted">{t.customers.deleteKeepsSales(sales)}</p>}
          </>
        }
        confirmLabel={t.customers.deleteConfirmLabel}
        danger
        busy={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
