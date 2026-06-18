import { lineItemAmount, normalizeCommercials } from "./commercials-line-item";
import type { ProposalPreviewData } from "./proposal-preview";

export const COMMERCIALS_TABLE_HEADERS = [
  "Description",
  "Qty",
  "Rate (INR)",
  "Amount (INR)",
] as const;

export type CommercialsTableRow =
  | { kind: "line"; description: string; qty: string; rate: string; amount: string }
  | { kind: "merged-total"; label: string; amount: string; bold?: boolean };

export function buildCommercialsTableRows(
  commercials: ProposalPreviewData["commercials"],
): CommercialsTableRow[] {
  const normalized = normalizeCommercials(commercials);
  const rows: CommercialsTableRow[] = normalized.line_items.map((li) => ({
    kind: "line",
    description: li.description,
    qty: String(li.qty),
    rate: li.rate > 0 ? li.rate.toLocaleString("en-IN") : "—",
    amount: lineItemAmount(li).toLocaleString("en-IN"),
  }));

  rows.push({
    kind: "merged-total",
    label: "Subtotal",
    amount: normalized.subtotal.toLocaleString("en-IN"),
  });
  rows.push({
    kind: "merged-total",
    label: `GST @ ${normalized.gst_percent}%`,
    amount: normalized.gst_amount.toLocaleString("en-IN"),
  });
  rows.push({
    kind: "merged-total",
    label: "Grand Total",
    amount: normalized.total.toLocaleString("en-IN"),
    bold: true,
  });

  return rows;
}
