/**
 * Supabase client for server components, server actions and route handlers.
 * It acts as the signed-in user (session cookie), so Row Level Security
 * applies: only people listed in the `staff` table can read or write data.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export function supabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  }
  return { url, key };
}

async function create() {
  // Read cookies first: it marks the page as dynamic, so a missing env var
  // fails at request time with a clear message instead of breaking the build.
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a server component, where cookies are read-only.
          // The middleware refreshes the session cookie instead.
        }
      },
    },
  });
}

/** One client per request. */
export const createClient = cache(create);
