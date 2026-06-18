function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert legacy Item/Detail table rows into rich HTML for backward compatibility. */
export function overviewRowsToHtml(rows: string[][]): string {
  if (!rows.length) return "";
  const items = rows
    .map(([label, value]) => {
      const l = escapeHtml(label.trim());
      const v = escapeHtml(value.trim() || "—");
      return `<li><p><strong>${l}</strong>: ${v}</p></li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}
