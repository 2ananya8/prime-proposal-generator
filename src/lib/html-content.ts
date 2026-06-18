/** Decode common HTML entities from rich-text editor output. */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanListItem(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/^[\s•*\-–—]+/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert rich-text HTML to plain text with paragraph breaks preserved. */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return normalizeWhitespace(decodeHtmlEntities(html));

  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  return normalizeWhitespace(decodeHtmlEntities(text));
}

/** Split rich-text HTML into bullet/list items. */
export function htmlToListItems(html: string): string[] {
  if (!html?.trim()) return [];
  if (!looksLikeHtml(html)) {
    return html.split(/\n+/).map(cleanListItem).filter(Boolean);
  }

  const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (liMatches.length) {
    return liMatches
      .map((match) => cleanListItem(htmlToPlainText(match[1])))
      .filter(Boolean);
  }

  const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  if (pMatches.length) {
    return pMatches
      .map((match) => cleanListItem(htmlToPlainText(match[1])))
      .filter(Boolean);
  }

  return htmlToPlainText(html)
    .split(/\n+/)
    .map(cleanListItem)
    .filter(Boolean);
}

/** Flatten string arrays that may contain one HTML blob or many plain items. */
export function expandListField(items: string[] | undefined): string[] {
  if (!items?.length) return [];
  return items.flatMap((item) => {
    if (!item?.trim()) return [];
    if (looksLikeHtml(item)) return htmlToListItems(item);
    return [cleanListItem(item)];
  }).filter(Boolean);
}

export function plainTextField(text: string | undefined | null): string {
  if (!text) return "";
  return looksLikeHtml(text) ? htmlToPlainText(text) : text.trim();
}

export type RichTextBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "ordered"; text: string; index: number };

function plainLinesToRichTextBlocks(text: string): RichTextBlock[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: /^[-*•–—]\s+/.test(line) ? "bullet" as const : "paragraph" as const,
      text: cleanListItem(line),
    }));
}

/** Parse rich-text HTML (TipTap) into ordered paragraph and list blocks for export. */
export function richTextToBlocks(text: string | undefined | null): RichTextBlock[] {
  if (!text?.trim()) return [];
  if (!looksLikeHtml(text)) return plainLinesToRichTextBlocks(text);

  const blocks: RichTextBlock[] = [];
  const html = text.trim();
  const blockRe = /<(p|ul|ol|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let matched = false;

  for (const match of html.matchAll(blockRe)) {
    matched = true;
    const tag = match[1].toLowerCase();
    const inner = match[2];
    if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      items.forEach((item, i) => {
        const itemText = htmlToPlainText(item[1]).trim();
        if (!itemText) return;
        if (tag === "ol") blocks.push({ type: "ordered", text: itemText, index: i + 1 });
        else blocks.push({ type: "bullet", text: itemText });
      });
      continue;
    }
    const paragraphText = htmlToPlainText(inner).trim();
    if (paragraphText) blocks.push({ type: "paragraph", text: paragraphText });
  }

  if (!matched) {
    const fallback = htmlToPlainText(html).trim();
    if (fallback) blocks.push({ type: "paragraph", text: fallback });
  }

  return blocks;
}
