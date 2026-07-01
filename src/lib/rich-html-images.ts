import { AlignmentType, ImageRun, Paragraph } from "docx";
import { decodeHtmlEntities } from "./html-content";
import {
  detectImageType,
  getImageDimensions,
  parseImageDataUrl,
  placeholderImage,
  scaleToFit,
  type ParsedImage,
} from "./cover-page-assets";

export type HtmlContentPart =
  | { type: "text"; html: string }
  | { type: "image"; src: string; alt: string };

const BODY_IMAGE_MAX_WIDTH_PX = 520;
const BODY_IMAGE_MAX_HEIGHT_PX = 700;

function readHtmlAttribute(tag: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*`, "i");
  const match = tag.match(re);
  if (!match || match.index === undefined) return "";

  const start = match.index + match[0].length;
  const quote = tag[start];
  if (quote === '"' || quote === "'") {
    let i = start + 1;
    while (i < tag.length && tag[i] !== quote) i++;
    return decodeHtmlEntities(tag.slice(start + 1, i));
  }

  let i = start;
  while (i < tag.length && !/\s/.test(tag[i]!)) i++;
  return decodeHtmlEntities(tag.slice(start, i));
}

function findImgTags(html: string): { index: number; length: number; tag: string }[] {
  const tags: { index: number; length: number; tag: string }[] = [];
  const lower = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const idx = lower.indexOf("<img", cursor);
    if (idx < 0) break;

    let end = html.indexOf(">", idx);
    if (end < 0) break;

    tags.push({ index: idx, length: end - idx + 1, tag: html.slice(idx, end + 1) });
    cursor = end + 1;
  }

  return tags;
}

/** Split HTML into text and image parts in document order. */
export function splitHtmlByImages(html: string): HtmlContentPart[] {
  const parts: HtmlContentPart[] = [];
  const imgTags = findImgTags(html);
  let lastIndex = 0;

  for (const { index, length, tag } of imgTags) {
    if (index > lastIndex) {
      const chunk = html.slice(lastIndex, index);
      if (chunk.trim()) parts.push({ type: "text", html: chunk });
    }

    const src = readHtmlAttribute(tag, "src");
    const alt = readHtmlAttribute(tag, "alt") || "Image";
    if (src) parts.push({ type: "image", src, alt });
    lastIndex = index + length;
  }

  if (lastIndex < html.length) {
    const tail = html.slice(lastIndex);
    if (tail.trim()) parts.push({ type: "text", html: tail });
  }

  if (!parts.length && html.trim()) {
    parts.push({ type: "text", html });
  }

  return parts;
}

export function textAlignFromHtmlAttrs(attrs = ""): (typeof AlignmentType)[keyof typeof AlignmentType] {
  if (/text-align:\s*center/i.test(attrs)) return AlignmentType.CENTER;
  if (/text-align:\s*right/i.test(attrs)) return AlignmentType.RIGHT;
  if (/text-align:\s*justify/i.test(attrs)) return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer;
}

function parseAnyDataUrl(src: string, alt: string): ParsedImage | null {
  const direct = parseImageDataUrl(src, alt);
  if (direct) return direct;

  const match = src.match(/^data:image\/[a-z0-9+.-]+(?:;[^,]*)?;base64,(.+)$/i);
  if (!match?.[1]) return null;

  try {
    const buffer = base64ToBytes(match[1]);
    const type = detectImageType(buffer);
    if (type === "png" || type === "jpg") return { buffer, type, alt };
  } catch {
    return null;
  }

  return null;
}

function rasterizeImageSrc(src: string): Promise<ParsedImage | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      resolve(parseImageDataUrl(pngUrl, "Image"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Decode embedded or remote images into PNG/JPEG bytes for PDF/DOCX export. */
export async function resolveImageForExport(src: string, alt: string): Promise<ParsedImage> {
  const trimmed = src.trim();
  if (!trimmed) return placeholderImage(alt);

  const parsed = parseAnyDataUrl(trimmed, alt);
  if (parsed) return parsed;

  if (trimmed.startsWith("data:image/")) {
    const rasterized = await rasterizeImageSrc(trimmed);
    if (rasterized) return { ...rasterized, alt };
  }

  if (/^https?:\/\//i.test(trimmed) && typeof fetch !== "undefined") {
    try {
      const response = await fetch(trimmed);
      if (response.ok) {
        const buffer = new Uint8Array(await response.arrayBuffer());
        const type = detectImageType(buffer);
        if (type === "png" || type === "jpg") return { buffer, type, alt };
        const blobUrl = URL.createObjectURL(new Blob([buffer]));
        try {
          const rasterized = await rasterizeImageSrc(blobUrl);
          if (rasterized) return { ...rasterized, alt };
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch {
      // fall through to placeholder
    }
  }

  return placeholderImage(alt);
}

export function buildDocxImageParagraphFromParsed(
  img: ParsedImage,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER,
): Paragraph {
  const dims = getImageDimensions(img.buffer);
  const size = scaleToFit(dims.width, dims.height, BODY_IMAGE_MAX_WIDTH_PX, BODY_IMAGE_MAX_HEIGHT_PX);

  return new Paragraph({
    alignment: align,
    spacing: { before: 0, after: 120 },
    children: [
      new ImageRun({
        type: img.type,
        data: img.buffer,
        transformation: { width: size.width, height: size.height },
        altText: { title: img.alt, description: img.alt, name: img.alt },
      }),
    ],
  });
}

export async function buildDocxImageParagraph(
  src: string,
  alt: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER,
): Promise<Paragraph> {
  const parsed = await resolveImageForExport(src, alt);
  return buildDocxImageParagraphFromParsed(parsed, align);
}

export function htmlContainsImages(html: string): boolean {
  return /<img\b/i.test(html);
}
