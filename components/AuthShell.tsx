import type { ReactNode } from "react";
import Credit from "./Credit";
import { t } from "@/lib/strings";

/** Centered card layout shared by login, forgot-password and reset-password. */
export default function AuthShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/brand/logo-badge.png"
            alt=""
            width={176}
            height={176}
            className="mx-auto mb-3 h-44 w-44 rounded-full shadow-sm ring-1 ring-line"
          />
          <h1 className="sr-only">{t.appName}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
        <Credit className="mt-6 text-center" />
      </div>
    </main>
  );
}
