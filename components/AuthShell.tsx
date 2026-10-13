import type { ReactNode } from "react";
import Credit from "./Credit";
import { t } from "@/lib/strings";

/** Centered card layout shared by login, forgot-password and reset-password. */
export default function AuthShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft font-brand text-4xl text-accent-strong">
            E
          </div>
          <h1 className="font-brand text-3xl tracking-wide">{t.appName}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
        <Credit className="mt-6 text-center" />
      </div>
    </main>
  );
}
