import { AlignmentType, ImageRun, Paragraph } from "docx";
import { decodeHtmlEntities } from "./html-content";
import {
  detectEmbeddableImageType,
  getImageDimensions,
  parseImageDataUrl,
  placeholderImage,
  scaleToFit,
  type ParsedImage,
} from "./cover-page-assets";

export type HtmlContentPart =
  | { type: "text"; html: string }
  | { type: "image"; src: string; alt: string; index: number };

const BODY_IMAGE_MAX_WIDTH_PX = 520;
const BODY_IMAGE_MAX_HEIGHT_PX = 700;
/** Downscale large uploads before embedding (preview shows full size; Word/PDF need smaller bitmaps). */
const EXPORT_MAX_PIXEL_WIDTH = 900;
const EXPORT_MAX_PIXEL_HEIGHT = 1200;

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

function findImgTagEnd(html: string, start: number): number {
  let i = start + 4;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < html.length && html[i] !== quote) i++;
      if (i < html.length) i++;
      continue;
    }
    if (ch === ">") return i;
    i++;
  }
  return -1;
}

function findImgTags(html: string): { index: number; length: number; tag: string }[] {
  const tags: { index: number; length: number; tag: string }[] = [];
  const lower = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const idx = lower.indexOf("<img", cursor);
    if (idx < 0) break;

    const end = findImgTagEnd(html, idx);
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
    if (src) parts.push({ type: "image", src, alt, index });
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

/** Guess paragraph alignment wrapping an image (service images default to centered). */
export function alignmentForImageAt(html: string, imageIndex: number): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const before = html.slice(Math.max(0, imageIndex - 400), imageIndex);
  const pMatch = before.match(/<p([^>]*)>(?:[^<]*)$/i);
  if (pMatch?.[1]) return textAlignFromHtmlAttrs(pMatch[1]);
  if (/text-align:\s*center/i.test(before)) return AlignmentType.CENTER;
  return AlignmentType.CENTER;
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
    const type = detectEmbeddableImageType(buffer);
    if (type) return { buffer, type, alt };
  } catch {
    return null;
  }

  return null;
}

function rasterizeImageSrc(
  src: string,
  maxWidth = EXPORT_MAX_PIXEL_WIDTH,
  maxHeight = EXPORT_MAX_PIXEL_HEIGHT,
): Promise<ParsedImage | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin on data:/blob: URLs breaks loading in several browsers.
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(null);
        return;
      }

      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const pngUrl = canvas.toDataURL("image/png");
      resolve(parseImageDataUrl(pngUrl, "Image"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function downscaleParsedImageForExport(img: ParsedImage): Promise<ParsedImage> {
  const dims = getImageDimensions(img.buffer);
  if (dims.width <= EXPORT_MAX_PIXEL_WIDTH && dims.height <= EXPORT_MAX_PIXEL_HEIGHT) {
    return img;
  }
  if (typeof document === "undefined") return img;

  const mime = img.type === "jpg" ? "image/jpeg" : "image/png";
  const url = URL.createObjectURL(new Blob([img.buffer], { type: mime }));
  try {
    const downscaled = await rasterizeImageSrc(url);
    if (downscaled) return downscaled;
  } finally {
    URL.revokeObjectURL(url);
  }
  return img;
}

/** Decode embedded or remote images into PNG/JPEG bytes for PDF/DOCX export. */
export async function resolveImageForExport(src: string, alt: string): Promise<ParsedImage> {
  const trimmed = src.trim();
  if (!trimmed) return placeholderImage(alt);

  const parsed = parseAnyDataUrl(trimmed, alt);
  if (parsed) {
    const sized = await downscaleParsedImageForExport(parsed);
    return { ...sized, alt };
  }

  if (typeof Image !== "undefined" && typeof document !== "undefined") {
    if (
      trimmed.startsWith("data:image/")
      || trimmed.startsWith("blob:")
      || /^https?:\/\//i.test(trimmed)
    ) {
      const rasterized = await rasterizeImageSrc(trimmed);
      if (rasterized) return { ...rasterized, alt };
    }
  }

  if (/^https?:\/\//i.test(trimmed) && typeof fetch !== "undefined") {
    try {
      const response = await fetch(trimmed);
      if (response.ok) {
        const buffer = new Uint8Array(await response.arrayBuffer());
        const type = detectEmbeddableImageType(buffer);
        if (type) {
          const sized = await downscaleParsedImageForExport({ buffer, type, alt });
          return sized;
        }
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

/** Layout dimensions for drawing an exported image in PDF (uses buffer metadata). */
export function pdfImageLayout(
  img: ParsedImage,
  maxWidth: number,
): { width: number; height: number } {
  const dims = getImageDimensions(img.buffer);
  const width = Math.min(maxWidth, dims.width);
  const height = Math.max(1, Math.round((dims.height / Math.max(dims.width, 1)) * width));
  return { width, height };
}
