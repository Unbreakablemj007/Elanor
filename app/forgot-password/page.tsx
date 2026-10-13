import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import ForgotForm from "./ForgotForm";
import { PASSWORD_RESET_EMAIL_ENABLED } from "@/lib/features";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.forgot.title };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!PASSWORD_RESET_EMAIL_ENABLED) redirect("/login");
  const { error } = await searchParams;
  return (
    <AuthShell subtitle={t.forgot.title}>
      <ForgotForm linkError={error === "link"} />
    </AuthShell>
  );
}
