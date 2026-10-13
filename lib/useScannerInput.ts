"use client";

import { useEffect, useRef } from "react";

/**
 * USB / Bluetooth barcode scanners act like a keyboard: they "type" the code
 * very fast and press Enter (some press Tab). This listens for such a burst
 * anywhere on the page (except while the user is typing in a field, which
 * handles its own Enter) and hands the scanned text to `onScan`.
 */
export function useScannerInput(onScan: (text: string) => void, enabled = true) {
  const handler = useRef(onScan);
  handler.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let last = 0;
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isField(e.target)) return;
      const now = performance.now();
      // A scanner sends keys a few milliseconds apart; a person types much slower.
      if (now - last > 80) buffer = "";
      last = now;
      if (e.key === "Enter" || e.key === "Tab") {
        if (buffer.length >= 6) {
          e.preventDefault();
          handler.current(buffer);
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}

/** True when scanned text came through a non-English keyboard layout (e.g. Arabic). */
export function looksLikeWrongLayout(text: string): boolean {
  return /[^\x20-\x7E]/.test(text);
}
