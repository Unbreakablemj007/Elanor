"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { t } from "@/lib/strings";

export type ScanResult = { ok: boolean; message: string };

/**
 * Camera QR scanner in a modal. Keeps scanning until closed, so several items
 * can be scanned in a row. `onScan` returns the message to show for each code.
 */
export default function QrScanner({
  open,
  onClose,
  onScan,
  title = t.scan.title,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => ScanResult;
  title?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");
  const [last, setLast] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    let lastText = "";
    let lastAt = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    setError("");
    setLast(null);

    const tick = () => {
      if (stopped) return;
      const v = video.current;
      if (v && ctx && v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        const now = Date.now();
        if (code?.data) {
          // The same label only counts again after it has left the camera view
          // for a moment, so holding it still never adds it twice.
          const repeat = code.data === lastText && now - lastAt < 1200;
          lastText = code.data;
          lastAt = now;
          if (!repeat) {
            const result = onScanRef.current(code.data);
            setLast(result);
            navigator.vibrate?.(result.ok ? 80 : [60, 60, 60]);
          }
        }
      }
      timer = window.setTimeout(tick, 150);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((tr) => tr.stop());
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play().catch(() => {});
        }
        tick();
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError(name === "NotAllowedError" ? t.scan.denied : t.scan.unavailable);
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {error ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={video} className="aspect-square w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80" />
        </div>
      )}
      <p className="mt-3 min-h-10 text-center text-sm" role="status" aria-live="polite">
        {last ? (
          <span className={last.ok ? "font-medium text-success" : "font-medium text-danger"}>{last.message}</span>
        ) : (
          !error && <span className="text-muted">{t.scan.hint}</span>
        )}
      </p>
      <button type="button" className="btn-primary mt-2 w-full" onClick={onClose}>
        {t.scan.done}
      </button>
    </Modal>
  );
}
