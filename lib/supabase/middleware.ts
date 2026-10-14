import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session cookie on every request and return the
 * signed-in user's id (or null). Must run before any redirect decision.
 */
export async function updateSession(
  req: NextRequest,
): Promise<{ response: NextResponse; userId: string | null; role: string | null }> {
  let response = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return { response, userId: null, role: null };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) req.cookies.set(name, value);
        response = NextResponse.next({ request: req });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return { response, userId: null, role: null };
  // The staff role decides which pages this person may open.
  const { data } = await supabase.from("staff").select("role").eq("user_id", user.id).maybeSingle();
  return { response, userId: user.id, role: data?.role ? String(data.role) : null };
}
