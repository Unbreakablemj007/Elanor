import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import { isKnownUser } from "./users";

/** Logged-in username, or null. Users removed from AUTH_USERS are rejected. */
export async function getCurrentUser(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const username = await verifySessionToken(token);
  return username && isKnownUser(username) ? username : null;
}

/** For pages and server actions: the username, or redirect to /login. */
export async function requireUser(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
