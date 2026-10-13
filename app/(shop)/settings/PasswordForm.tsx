"use client";

import { useState, useTransition } from "react";
import { ErrorBox } from "@/components/ui";
import { t } from "@/lib/strings";
import { changePassword } from "./actions";

export default function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (next !== confirm) return setError(t.password.mismatch);
    startTransition(async () => {
      const res = await changePassword({ current, next });
      if (!res.ok) return setError(res.error);
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-semibold">{t.password.title}</h2>
      <div>
        <label className="label" htmlFor="pw-current">
          {t.password.current}
        </label>
        <input id="pw-current" type="password" className="input" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="pw-new">
          {t.password.new}
        </label>
        <input id="pw-new" type="password" className="input" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
        <p className="mt-1 text-xs text-muted">{t.password.help}</p>
      </div>
      <div>
        <label className="label" htmlFor="pw-confirm">
          {t.password.confirm}
        </label>
        <input id="pw-confirm" type="password" className="input" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {saved && <p className="text-sm text-success">{t.password.saved}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.saving : t.password.submit}
      </button>
    </form>
  );
}
