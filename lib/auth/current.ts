import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Display name of the signed-in staff member, or null.
 * A Supabase account that is not in the `staff` table counts as signed out.
 */
export const getCurrentUser = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("staff").select("display_name").eq("user_id", user.id).maybeSingle();
  if (error) console.error(`[auth] could not read the staff list: ${error.message}`);
  return data?.display_name ? String(data.display_name) : null;
});

/** For pages and server actions: the staff member's name, or redirect to /login. */
export async function requireUser(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
