import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { PASSWORD_RESET_EMAIL_ENABLED } from "@/lib/features";
import LoginForm from "./LoginForm";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.login.title };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell subtitle={t.login.subtitle}>
      <LoginForm next={typeof next === "string" ? next : undefined} />
      {PASSWORD_RESET_EMAIL_ENABLED && (
        <Link href="/forgot-password" className="mt-4 block text-center text-sm text-muted hover:text-accent-strong">
          {t.login.forgot}
        </Link>
      )}
    </AuthShell>
  );
}
