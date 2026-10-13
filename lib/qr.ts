/** QR labels: what the code contains and how a scan is read back. */

/** Variant IDs look like V-261013-K7QD (see lib/ids.ts). */
const VARIANT_ID = /V-\d{6}-[A-Z0-9]{4}/;

/**
 * The QR holds a link to the item in this app (…/v/V-261013-K7QD), so a normal
 * phone camera opens the product page, and the app's own scanner can read the
 * ID straight out of it.
 */
export function variantQrPayload(origin: string, variantId: string): string {
  return `${origin.replace(/\/$/, "")}/v/${variantId}`;
}

/** The variant ID inside a scanned QR (link or bare ID), or null. */
export function variantIdFromScan(text: string): string | null {
  return text.toUpperCase().match(VARIANT_ID)?.[0] ?? null;
}
