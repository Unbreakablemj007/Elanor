"use client";

import { useState, useTransition } from "react";
import { addOption } from "@/app/(shop)/lists/actions";
import { PlusIcon } from "./icons";
import { Modal } from "./Modal";
import { t } from "@/lib/strings";

type ListName = "categories" | "sizes" | "colors" | "expense_categories";

/** Small "+" button that adds a new value to a dropdown list and selects it. */
export default function AddOption({
  list,
  title,
  onAdded,
}: {
  list: ListName;
  title: string;
  onAdded: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // No <form> here: this sits inside the product/expense form, and forms can't be nested.
  function save() {
    if (!value.trim() || pending) return;
    setError("");
    startTransition(async () => {
      const res = await addOption({ list, value });
      if (!res.ok) return setError(res.error);
      onAdded(res.data.value);
      setValue("");
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-accent-strong hover:bg-accent-soft"
        onClick={() => setOpen(true)}
        aria-label={title}
        title={title}
      >
        <PlusIcon width={14} height={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-3">
          <input
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            placeholder={t.addOption.placeholder}
            autoFocus
            aria-label={title}
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="button" className="btn-primary w-full" onClick={save} disabled={pending || !value.trim()}>
            {pending ? t.common.saving : t.common.add}
          </button>
        </div>
      </Modal>
    </>
  );
}
