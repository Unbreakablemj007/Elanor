import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/forgot-password", "/auth/confirm", "/reset-password"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const { response, userId } = await updateSession(req);

  // Keep refreshed session cookies on redirects too.
  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (pathname === "/login") {
    return userId ? redirectTo(new URL("/", req.url)) : response;
  }
  // Password-reset pages work without a session (reset-password checks its own).
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return response;

  if (!userId) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return redirectTo(url);
  }
  // Pages also check the staff list (requireUser) and the database enforces it (RLS).
  return response;
}

export const config = {
  // Everything except Next internals and the public PWA files (manifest,
  // icons) which the browser fetches without a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|brand/|apple-touch-icon.png).*)"],
};
