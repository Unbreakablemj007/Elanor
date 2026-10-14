import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toRole, type Role } from "./roles";

export type StaffMember = { name: string; role: Role };

/**
 * The signed-in staff member, or null.
 * A Supabase account that is not in the `staff` table counts as signed out.
 */
export const getCurrentStaff = cache(async (): Promise<StaffMember | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("staff")
    .select("display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) console.error(`[auth] could not read the staff list: ${error.message}`);
  return data?.display_name ? { name: String(data.display_name), role: toRole(data.role) } : null;
});

/** Display name of the signed-in staff member, or null. */
export async function getCurrentUser(): Promise<string | null> {
  return (await getCurrentStaff())?.name ?? null;
}

/** For pages and server actions: the staff member's name, or redirect to /login. */
export async function requireUser(): Promise<string> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  return staff.name;
}
