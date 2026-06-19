/** Strip invalid characters — digits and at most one decimal point, no minus sign. */
export function filterPositiveNumericText(value: string): string {
  let result = "";
  let hasDot = false;
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") {
      result += ch;
    } else if (ch === "." && !hasDot) {
      hasDot = true;
      result += ch;
    }
  }
  return result;
}

/** Parse filtered text to a non-negative number (0 when empty or invalid). */
export function parsePositiveNumericText(value: string): number {
  if (value === "" || value === ".") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function formatPositiveNumericField(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n === 0) return "";
  return String(n);
}
