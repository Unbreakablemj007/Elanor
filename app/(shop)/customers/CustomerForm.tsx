"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorBox } from "@/components/ui";
import { t } from "@/lib/strings";
import { createCustomer, saveCustomer } from "./actions";

export default function CustomerForm({
  initial,
}: {
  initial?: { customer_id: string; name: string; phone: string; notes: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      if (initial) {
        const res = await saveCustomer(initial.customer_id, { name, phone, notes });
        if (!res.ok) return setError(res.error);
        setSaved(true);
        router.refresh();
      } else {
        const res = await createCustomer({ name, phone, notes });
        if (!res.ok) return setError(res.error);
        router.push(`/customers/${res.data.customer_id}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="c-name">
          {t.customers.name}
        </label>
        <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="c-phone">
          {t.customers.phone} <span className="font-normal">({t.common.optional})</span>
        </label>
        <input id="c-phone" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
      </div>
      <div>
        <label className="label" htmlFor="c-notes">
          {t.common.notes} <span className="font-normal">({t.common.optional})</span>
        </label>
        <textarea id="c-notes" className="input min-h-20 py-2" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {saved && <p className="text-sm text-success">{t.settings.saved}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.saving : t.common.save}
      </button>
    </form>
  );
}
