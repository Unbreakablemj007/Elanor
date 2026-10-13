"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrIcon } from "@/components/icons";
import QrScanner, { type ScanResult } from "@/components/QrScanner";
import { variantIdFromScan } from "@/lib/qr";
import { t } from "@/lib/strings";

/** Scan a QR label to jump to that product (e.g. to restock or check stock). */
export default function ScanToOpen() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function onScan(text: string): ScanResult {
    const id = variantIdFromScan(text);
    if (!id) return { ok: false, message: t.scan.unknown };
    setOpen(false);
    router.push(`/v/${id}`);
    return { ok: true, message: t.scan.opening(id) };
  }

  return (
    <>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(true)}>
        <QrIcon width={18} height={18} />
        {t.scan.button}
      </button>
      <QrScanner open={open} onClose={() => setOpen(false)} onScan={onScan} />
    </>
  );
}
