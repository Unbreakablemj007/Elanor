"use client";

import { useActionState } from "react";
import { setNewPassword, type ResetState } from "./actions";
import { t } from "@/lib/strings";

export default function ResetForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted">{t.reset.help(email)}</p>
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div>
        <label htmlFor="next" className="label">
          {t.password.new}
        </label>
        <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-muted">{t.password.help}</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          {t.password.confirm}
        </label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.saving : t.reset.submit}
      </button>
    </form>
  );
}
