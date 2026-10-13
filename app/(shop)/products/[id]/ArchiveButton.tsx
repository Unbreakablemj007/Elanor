"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/Modal";
import { ErrorBox } from "@/components/ui";
import { t } from "@/lib/strings";
import { setProductActive } from "../actions";

export default function ArchiveButton({ productId, active }: { productId: string; active: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const res = await setProductActive(productId, !active);
      if (!res.ok) setError(res.error);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" className="btn-secondary btn-sm w-full" onClick={() => setOpen(true)}>
        {active ? t.products.archive : t.products.unarchive}
      </button>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ConfirmDialog
        open={open}
        title={active ? t.products.archive : t.products.unarchive}
        message={active ? t.products.archiveConfirm : t.products.unarchiveConfirm}
        danger={active}
        busy={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
