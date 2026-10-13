"use client";

import { useRef, useState } from "react";
import { CameraIcon, TrashIcon } from "./icons";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { t } from "@/lib/strings";

const BUCKET = "product-images";
const MAX_SIDE = 1280; // px — plenty for a phone screen, keeps files ~150–300 KB
const QUALITY = 0.82;

/** Shrink a phone photo to a reasonable JPEG (also applies the camera's rotation). */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", QUALITY),
  );
}

export default function ImageUpload({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) return setError(t.photo.notImage);
    setBusy(true);
    onBusyChange?.(true);
    try {
      let blob: Blob;
      try {
        blob = await compress(file);
      } catch {
        throw new Error(t.photo.unreadable);
      }
      const path = `products/${crypto.randomUUID()}.jpg`;
      const supabase = createBrowserSupabase();
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) throw new Error(`${t.photo.failed} (${upErr.message})`);
      onChange(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.photo.failed);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">
        {t.photo.label} <span className="font-normal">({t.common.optional})</span>
      </span>
      <div className="flex items-center gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-bg">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <CameraIcon className="text-muted" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            <CameraIcon width={18} height={18} />
            {busy ? t.photo.uploading : value ? t.photo.change : t.photo.add}
          </button>
          {value && !busy && (
            <button type="button" className="btn-secondary btn-sm text-danger" onClick={() => onChange("")}>
              <TrashIcon width={18} height={18} />
              {t.photo.remove}
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <p className="mt-1 text-xs text-muted">{t.photo.help}</p>
      {error && <p role="alert" className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
