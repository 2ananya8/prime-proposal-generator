import { htmlToPlainText } from "@/lib/html-content";

export type ParsedHtmlTable = { headers: string[]; rows: string[][] };

/** Visible borders for proposal preview tables (screen + print). */
export const PROPOSAL_TABLE_WRAPPER_CLASS = "overflow-x-auto rounded border border-gray-500";
export const PROPOSAL_TABLE_CLASS = "w-full text-sm border-collapse border border-gray-500";
export const PROPOSAL_TABLE_HEADER_CELL_CLASS =
  "text-left font-semibold px-3 py-2 border border-gray-500 bg-[#D5E8F0]";
export const PROPOSAL_TABLE_BODY_CELL_CLASS = "px-3 py-2 border border-gray-500 align-top";

/** Tailwind classes for TipTap / rich-text tables in editor and preview. */
export const RICH_TEXT_TABLE_CLASS =
  "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm [&_table]:border [&_table]:border-gray-500 " +
  "[&_th]:border [&_th]:border-gray-500 [&_th]:bg-[#D5E8F0] [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-gray-500 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top";

export function parseHtmlTableInner(tableInnerHtml: string): ParsedHtmlTable {
  const rowMatches = [...tableInnerHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const allRows: string[][] = [];

  for (const row of rowMatches) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      htmlToPlainText(c[1]).trim(),
    );
    if (cells.length) allRows.push(cells);
  }

  if (!allRows.length) return { headers: [], rows: [] };

  const firstRowHtml = rowMatches[0]?.[0] ?? "";
  if (/<th[\s>]/i.test(firstRowHtml)) {
    return { headers: allRows[0], rows: allRows.slice(1) };
  }

  const colCount = Math.max(...allRows.map((r) => r.length), 1);
  return {
    headers: Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`),
    rows: allRows,
  };
}

export function parseHtmlTables(html: string): ParsedHtmlTable[] {
  return [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)]
    .map((match) => parseHtmlTableInner(match[1]))
    .filter((t) => t.headers.length > 0 || t.rows.length > 0);
}

/** Top-level rich HTML blocks in document order (paragraphs, lists, headings, tables). */
export function splitRichHtmlBlocks(html: string): { tag: string; inner: string }[] {
  const blocks: { tag: string; inner: string }[] = [];
  const re = /<(p|ul|ol|h[1-6]|table)[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(re)) {
    blocks.push({ tag: match[1].toLowerCase(), inner: match[2] });
  }
  return blocks;
}
