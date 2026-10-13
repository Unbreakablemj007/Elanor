"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrIcon } from "@/components/icons";
import QrScanner, { type ScanResult } from "@/components/QrScanner";
import { variantIdFromScan } from "@/lib/qr";
import { looksLikeWrongLayout, useScannerInput } from "@/lib/useScannerInput";
import { t } from "@/lib/strings";

/** Scan a QR label to jump to that product (e.g. to restock or check stock). */
export default function ScanToOpen() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function onScan(text: string): ScanResult {
    const id = variantIdFromScan(text);
    if (!id) return { ok: false, message: looksLikeWrongLayout(text) ? t.scan.wrongLayout : t.scan.unknown };
    setOpen(false);
    router.push(`/v/${id}`);
    return { ok: true, message: t.scan.opening(id) };
  }

  // USB / Bluetooth scanner anywhere on the Products page.
  useScannerInput((text) => {
    const r = onScan(text);
    setNotice(r.ok ? "" : r.message);
    if (!r.ok) window.setTimeout(() => setNotice(""), 5000);
  }, !open);

  return (
    <>
      {notice && (
        <p role="alert" className="fixed inset-x-4 top-4 z-40 mx-auto max-w-md rounded-xl bg-danger px-3 py-2 text-sm text-white shadow-lg" onClick={() => setNotice("")}>
          {notice}
        </p>
      )}
      <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(true)}>
        <QrIcon width={18} height={18} />
        {t.scan.button}
      </button>
      <QrScanner open={open} onClose={() => setOpen(false)} onScan={onScan} />
    </>
  );
}
