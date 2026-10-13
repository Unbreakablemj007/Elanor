"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "@/lib/dates";
import { formatLbp, formatUsd } from "@/lib/format";
import { changeText, itemLabel, paidText, receiptText, whatsappLink, type ReceiptData } from "@/lib/receipt";
import { t } from "@/lib/strings";

export default function Receipt({ data }: { data: ReceiptData }) {
  const [busy, setBusy] = useState(false);
  const text = receiptText(data);

  async function shareImage() {
    setBusy(true);
    try {
      const blob = await drawReceipt(data);
      const file = new File([blob], `${data.saleId}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${data.shopName} ${data.saleId}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      // User cancelled the share sheet: nothing to do.
      if (!(err instanceof DOMException && err.name === "AbortError")) console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <article className="card space-y-3 font-mono text-sm print:border-0 print:p-0">
        <header className="text-center font-sans">
          <h2 className="font-brand text-2xl">{data.shopName}</h2>
          <p className="text-xs text-muted">
            {t.receipt.sale} {data.saleId}
          </p>
          <p className="text-xs text-muted">{formatDateTime(data.date)}</p>
          {data.customerName && (
            <p className="mt-1 text-xs">
              {t.receipt.customer}: {data.customerName}
            </p>
          )}
        </header>
        <hr className="border-dashed border-line" />
        <ul className="space-y-2">
          {data.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3">
              <span>
                {i.qty} × {itemLabel(i)}
                {i.returnedQty > 0 && <span className="block text-xs text-danger">{t.sales.returned(i.returnedQty)}</span>}
              </span>
              <span className="shrink-0">{formatUsd(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <hr className="border-dashed border-line" />
        <dl className="space-y-1">
          <Line label={t.receipt.subtotal} value={formatUsd(data.subtotal)} />
          {data.discount > 0 && <Line label={t.receipt.discount} value={`−${formatUsd(data.discount)}`} />}
          <Line label={t.receipt.total} value={formatUsd(data.total)} strong />
          <Line label="" value={formatLbp(data.totalLbp)} />
          <Line label={t.receipt.paid} value={paidText(data)} />
          {changeText(data) && <Line label={t.receipt.change} value={changeText(data)} />}
        </dl>
        <p className="pt-2 text-center font-sans text-xs text-muted">{t.receipt.thanks}</p>
      </article>

      <div className="no-print grid gap-2">
        <a href={whatsappLink(text, data.customerPhone)} target="_blank" rel="noopener noreferrer" className="btn-primary">
          {t.receipt.whatsapp}
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={shareImage} disabled={busy}>
            {t.receipt.shareImage}
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            {t.receipt.print}
          </button>
        </div>
        <Link href="/sell" className="btn-secondary">
          {t.receipt.newSale}
        </Link>
      </div>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-base font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

/** Render the receipt onto a canvas (no extra dependencies) and return a PNG. */
async function drawReceipt(d: ReceiptData): Promise<Blob> {
  const scale = 2;
  const width = 420;
  const pad = 24;
  const mono = "15px ui-monospace, Menlo, Consolas, monospace";
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue("--color-accent-strong").trim() || "#8f5f69";

  type Row = { left: string; right?: string; font?: string; align?: "center"; color?: string; gap?: number };
  const rows: Row[] = [
    { left: d.shopName, font: "bold 26px Georgia, serif", align: "center", color: accent, gap: 34 },
    { left: `${t.receipt.sale} ${d.saleId}`, font: "13px sans-serif", align: "center", color: "#7a6f6b" },
    { left: formatDateTime(d.date), font: "13px sans-serif", align: "center", color: "#7a6f6b" },
  ];
  if (d.customerName) rows.push({ left: `${t.receipt.customer}: ${d.customerName}`, font: "13px sans-serif", align: "center" });
  rows.push({ left: "-".repeat(40), color: "#c9bdb8" });

  const ctx0 = document.createElement("canvas").getContext("2d")!;
  ctx0.font = mono;
  const maxLeft = width - pad * 2 - 90;
  for (const i of d.items) {
    // Wrap long product names.
    const words = `${i.qty} × ${itemLabel(i)}`.split(" ");
    let line = "";
    const wrapped: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx0.measureText(test).width > maxLeft && line) {
        wrapped.push(line);
        line = w;
      } else line = test;
    }
    wrapped.push(line);
    wrapped.forEach((l, idx) => rows.push({ left: l, right: idx === 0 ? formatUsd(i.lineTotal) : undefined }));
    if (i.returnedQty > 0) rows.push({ left: `  ${t.sales.returned(i.returnedQty)}`, color: "#b4433b" });
  }
  rows.push({ left: "-".repeat(40), color: "#c9bdb8" });
  rows.push({ left: t.receipt.subtotal, right: formatUsd(d.subtotal) });
  if (d.discount > 0) rows.push({ left: t.receipt.discount, right: `−${formatUsd(d.discount)}` });
  rows.push({ left: t.receipt.total, right: formatUsd(d.total), font: "bold 17px ui-monospace, Menlo, monospace" });
  rows.push({ left: "", right: formatLbp(d.totalLbp) });
  rows.push({ left: t.receipt.paid, right: paidText(d) });
  if (changeText(d)) rows.push({ left: t.receipt.change, right: changeText(d) });
  rows.push({ left: t.receipt.thanks, font: "13px sans-serif", align: "center", color: "#7a6f6b", gap: 36 });

  const lineHeight = 24;
  const height = pad * 2 + rows.reduce((h, r) => h + (r.gap ?? lineHeight), 0);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "middle";

  let y = pad;
  for (const r of rows) {
    const h = r.gap ?? lineHeight;
    const cy = y + h / 2;
    ctx.font = r.font ?? mono;
    ctx.fillStyle = r.color ?? "#2b2523";
    if (r.align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(r.left, width / 2, cy);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(r.left, pad, cy);
      if (r.right) {
        ctx.textAlign = "right";
        ctx.fillText(r.right, width - pad, cy);
      }
    }
    y += h;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png"),
  );
}
