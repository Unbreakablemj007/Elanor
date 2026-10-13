"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser (uses the same session cookies as the server). */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  );
}
