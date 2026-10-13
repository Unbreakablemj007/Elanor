/** Builds the receipt content once so the screen, WhatsApp text and image agree. */
import { formatDateTime } from "./dates";
import { formatLbp, formatUsd } from "./format";
import { variantLabel } from "./inventory";
import { t } from "./strings";

export type ReceiptData = {
  shopName: string;
  saleId: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; size: string; color: string; qty: number; unitPrice: number; lineTotal: number; returnedQty: number }[];
  subtotal: number;
  discount: number;
  total: number;
  totalLbp: number;
  paidUsd: number;
  paidLbp: number;
  changeUsd: number;
  changeLbp: number;
};

export function paidText(d: Pick<ReceiptData, "paidUsd" | "paidLbp">): string {
  return [d.paidUsd > 0 && formatUsd(d.paidUsd), d.paidLbp > 0 && formatLbp(d.paidLbp)].filter(Boolean).join(" + ") || "—";
}

export function changeText(d: Pick<ReceiptData, "changeUsd" | "changeLbp">): string {
  return [d.changeUsd > 0 && formatUsd(d.changeUsd), d.changeLbp > 0 && formatLbp(d.changeLbp)].filter(Boolean).join(" + ");
}

export function itemLabel(i: ReceiptData["items"][number]): string {
  const v = variantLabel(i);
  return v ? `${i.name} (${v})` : i.name;
}

/** Plain-text receipt for WhatsApp (uses WhatsApp *bold*). */
export function receiptText(d: ReceiptData): string {
  const lines = [
    `*${d.shopName}*`,
    `${t.receipt.sale} ${d.saleId}`,
    formatDateTime(d.date),
    d.customerName ? `${t.receipt.customer}: ${d.customerName}` : "",
    "",
    ...d.items.map((i) => `${i.qty} × ${itemLabel(i)} — ${formatUsd(i.lineTotal)}`),
    "",
    `${t.receipt.subtotal}: ${formatUsd(d.subtotal)}`,
    d.discount > 0 ? `${t.receipt.discount}: −${formatUsd(d.discount)}` : "",
    `*${t.receipt.total}: ${formatUsd(d.total)}* (${formatLbp(d.totalLbp)})`,
    `${t.receipt.paid}: ${paidText(d)}`,
    changeText(d) ? `${t.receipt.change}: ${changeText(d)}` : "",
    "",
    t.receipt.thanks,
  ];
  return lines.filter((l, i, arr) => l !== "" || (arr[i - 1] !== "" && i > 0)).join("\n");
}

/** wa.me link; Lebanese local numbers (e.g. 03 123 456) get the 961 prefix. */
export function whatsappLink(text: string, phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `961${digits.slice(1)}`;
  else if (digits && digits.length <= 8) digits = `961${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
