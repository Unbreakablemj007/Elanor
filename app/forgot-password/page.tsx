import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import ForgotForm from "./ForgotForm";
import { t } from "@/lib/strings";

export const metadata: Metadata = { title: t.forgot.title };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell subtitle={t.forgot.title}>
      <ForgotForm linkError={error === "link"} />
    </AuthShell>
  );
}
