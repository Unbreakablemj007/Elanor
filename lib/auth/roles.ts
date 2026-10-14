/** Staff roles. Owners see everything; cashiers can only make sales. */
export type Role = "owner" | "cashier";

export const toRole = (value: unknown): Role => (value === "cashier" ? "cashier" : "owner");

/** Pages a cashier may open (everything else sends them to /sell). */
export function cashierMayOpen(pathname: string): boolean {
  return pathname === "/sell" || /^\/sales\/[^/]+\/receipt\/?$/.test(pathname);
}

/**
 * Sign-in name → Supabase email. Supabase accounts need an email, so staff
 * without one get a made-up address on a domain that never receives mail:
 * "sara" → "sara@staff.misselanor.app".
 */
export const STAFF_EMAIL_DOMAIN = "staff.misselanor.app";

export function loginEmail(identifier: string): string {
  const id = identifier.trim().toLowerCase();
  if (id.includes("@")) return id;
  const slug = id.replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
  return `${slug}@${STAFF_EMAIL_DOMAIN}`;
}
