export type CommercialLineItem = {
  description: string;
  qty: number;
  rate: number;
  amount: number;
};

export type CommercialLineItemField = "qty" | "rate" | "amount";

export const EMPTY_COMMERCIAL_LINE_ITEM: CommercialLineItem = {
  description: "",
  qty: 1,
  rate: 0,
  amount: 0,
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundQty = (value: number) => Math.round(value * 1000) / 1000;
const isPositive = (value: number) => Number.isFinite(value) && value > 0;

/** Parse and clamp commercial numeric fields — minimum 0, no negatives. */
export function parseNonNegativeCommercialNumber(value: string): number {
  if (value === "" || value === "-") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/** Effective line amount for totals and export. */
export function lineItemAmount(item: Pick<CommercialLineItem, "qty" | "rate" | "amount">): number {
  if (isPositive(item.amount)) return roundMoney(item.amount);
  if (isPositive(item.qty) && isPositive(item.rate)) return roundMoney(item.qty * item.rate);
  return 0;
}

/** Recalculate the third field from whichever pair the user last edited. */
export function updateCommercialLineItem(
  item: CommercialLineItem,
  field: CommercialLineItemField,
  rawValue: number,
): CommercialLineItem {
  const next = { ...item, [field]: clampNonNegative(rawValue) };
  const qty = next.qty;
  const rate = next.rate;
  const amount = next.amount;

  if (field === "qty") {
    if (isPositive(qty) && isPositive(rate)) return { ...next, amount: roundMoney(qty * rate) };
    if (isPositive(qty) && isPositive(amount)) return { ...next, rate: roundMoney(amount / qty) };
    return next;
  }

  if (field === "rate") {
    if (isPositive(qty) && isPositive(rate)) return { ...next, amount: roundMoney(qty * rate) };
    if (isPositive(rate) && isPositive(amount)) return { ...next, qty: roundQty(amount / rate) };
    return next;
  }

  if (isPositive(qty) && isPositive(amount)) return { ...next, rate: roundMoney(amount / qty) };
  if (isPositive(rate) && isPositive(amount)) return { ...next, qty: roundQty(amount / rate) };
  return next;
}

export function normalizeCommercialLineItems(items: CommercialLineItem[]): CommercialLineItem[] {
  return items.map((item) => {
    const qty = clampNonNegative(item.qty);
    const rate = clampNonNegative(item.rate);
    const amount = clampNonNegative(item.amount);
    return {
      ...item,
      qty,
      rate,
      amount: lineItemAmount({ ...item, qty, rate, amount }),
    };
  });
}

export function commercialsSubtotal(items: CommercialLineItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + lineItemAmount(item), 0));
}

export type CommercialsData = {
  line_items: CommercialLineItem[];
  gst_percent: number;
  subtotal: number;
  gst_amount: number;
  total: number;
  notes?: string;
};

/** Ensure totals exist — older saved proposals may only have line items. */
export function normalizeCommercials(raw?: Partial<CommercialsData> | null): CommercialsData {
  const line_items = normalizeCommercialLineItems(raw?.line_items ?? []);
  const gst_percent = raw?.gst_percent ?? 18;
  const subtotal = raw?.subtotal ?? commercialsSubtotal(line_items);
  const gst_amount = raw?.gst_amount ?? roundMoney((subtotal * gst_percent) / 100);
  const total = raw?.total ?? roundMoney(subtotal + gst_amount);
  return { line_items, gst_percent, subtotal, gst_amount, total, notes: raw?.notes };
}
