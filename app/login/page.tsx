import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.login.title };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft font-brand text-4xl text-accent-strong">
            E
          </div>
          <h1 className="font-brand text-3xl tracking-wide">{t.appName}</h1>
          <p className="mt-1 text-sm text-muted">{t.login.subtitle}</p>
        </div>
        <div className="card p-6">
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </div>
    </main>
  );
}
