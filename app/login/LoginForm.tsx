"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { t } from "@/lib/strings";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
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
      <div>
        <label htmlFor="password" className="label">
          {t.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}
