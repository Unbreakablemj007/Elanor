"use client";

import { useState, useTransition } from "react";
import { removeOption } from "@/app/(shop)/lists/actions";
import { MinusIcon } from "./icons";
import { ConfirmDialog } from "./Modal";
import { t } from "@/lib/strings";

type ListName = "categories" | "sizes" | "colors" | "expense_categories";

/** Small "−" button that removes the currently selected value from a dropdown list. */
export default function RemoveOption({
  list,
  value,
  listLabel,
  inList,
  onRemoved,
}: {
  list: ListName;
  /** The value currently selected in the dropdown. */
  value: string;
  /** e.g. "category" — used in the confirmation text. */
  listLabel: string;
  /** Whether the selected value is actually in the saved list. */
  inList: boolean;
  onRemoved: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const disabled = !value || !inList;

  const confirm = () =>
    startTransition(async () => {
      setError("");
      const res = await removeOption({ list, value });
      if (!res.ok) return setError(res.error); // keep the dialog open and show why
      setOpen(false);
      onRemoved(value);
    });

  return (
    <>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-danger hover:bg-danger/10 disabled:opacity-30"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={t.removeOption.button(listLabel)}
        title={disabled ? t.removeOption.pickFirst : t.removeOption.button(listLabel)}
      >
        <MinusIcon width={14} height={14} />
      </button>
      <ConfirmDialog
        open={open}
        title={t.removeOption.title(listLabel)}
        message={
          <>
            <p>{t.removeOption.confirm(value, listLabel)}</p>
            {error && <p role="alert" className="mt-2 text-danger">{error}</p>}
          </>
        }
        confirmLabel={t.removeOption.confirmLabel}
        danger
        busy={pending}
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
          setError("");
        }}
      />
    </>
  );
}
