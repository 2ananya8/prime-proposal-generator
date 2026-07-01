import { AlignmentType, ImageRun, Paragraph } from "docx";
import {
  getImageDimensions,
  parseImageDataUrl,
  placeholderImage,
  scaleToFit,
} from "./cover-page-assets";

export type HtmlContentPart =
  | { type: "text"; html: string }
  | { type: "image"; src: string; alt: string };

const BODY_IMAGE_MAX_WIDTH_PX = 520;
const BODY_IMAGE_MAX_HEIGHT_PX = 700;

/** Split HTML into text and image parts in document order. */
export function splitHtmlByImages(html: string): HtmlContentPart[] {
  const parts: HtmlContentPart[] = [];
  const re = /<img[^>]*\/?>/gi;
  let lastIndex = 0;

  for (const match of html.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      const chunk = html.slice(lastIndex, idx);
      if (chunk.trim()) parts.push({ type: "text", html: chunk });
    }

    const tag = match[0];
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ?? "";
    const alt = tag.match(/\salt=["']([^"']*)["']/i)?.[1] ?? "Image";
    if (src) parts.push({ type: "image", src, alt });
    lastIndex = idx + match[0].length;
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

export function buildDocxImageParagraph(
  src: string,
  alt: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER,
): Paragraph {
  const parsed = parseImageDataUrl(src, alt) ?? placeholderImage(alt);
  const dims = getImageDimensions(parsed.buffer);
  const size = scaleToFit(dims.width, dims.height, BODY_IMAGE_MAX_WIDTH_PX, BODY_IMAGE_MAX_HEIGHT_PX);

  return new Paragraph({
    alignment: align,
    spacing: { before: 0, after: 120 },
    children: [
      new ImageRun({
        type: parsed.type,
        data: parsed.buffer,
        transformation: { width: size.width, height: size.height },
        altText: { title: alt, description: alt, name: alt },
      }),
    ],
  });
}

export function htmlContainsImages(html: string): boolean {
  return /<img[^>]*\/?>/i.test(html);
}
