import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/strings";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: t.reset.title };

/** Reached from the reset email: /auth/confirm signs the user in, then sends them here. */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/forgot-password?error=link");
  return (
    <AuthShell subtitle={t.reset.title}>
      <ResetForm email={user.email} />
    </AuthShell>
  );
}
