import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";

const OTP_TYPES: EmailOtpType[] = ["recovery", "email", "magiclink", "invite", "signup", "email_change"];

/**
 * Landing page for links in Supabase emails (password reset).
 * Handles both link styles:
 *  - ?token_hash=…&type=recovery  (custom email template; works on any device)
 *  - ?code=…                      (default template; same browser only)
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("next"), "/reset-password");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.error(`[auth] email link rejected: ${error.message}`);
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error(`[auth] email code rejected: ${error.message}`);
    ok = !error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/forgot-password?error=link", req.url));
}
