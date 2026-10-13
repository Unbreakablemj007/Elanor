"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "./actions";
import { t } from "@/lib/strings";

export default function ForgotForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, {});

  if (state.sent) {
    return (
      <div className="space-y-4 text-sm">
        <p role="status" className="rounded-xl bg-success/10 px-3 py-2 text-success">
          {t.forgot.sent(state.email ?? "")}
        </p>
        <p className="text-muted">{t.forgot.sentHelp}</p>
        <Link href="/login" className="btn-secondary w-full">
          {t.forgot.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {linkError && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {t.forgot.linkInvalid}
        </p>
      )}
      <p className="text-sm text-muted">{t.forgot.help}</p>
      <div>
        <label htmlFor="email" className="label">
          {t.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          className="input"
          defaultValue={state.email}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.forgot.sending : t.forgot.submit}
      </button>
      <Link href="/login" className="block text-center text-sm text-muted hover:text-accent-strong">
        {t.forgot.backToLogin}
      </Link>
    </form>
  );
}
