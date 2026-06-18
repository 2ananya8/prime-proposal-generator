import { rgb, type PDFDocument, type PDFPage, type PDFFont, type RGB } from "pdf-lib";
import type { ProposalPreviewData } from "./proposal-preview";
import { getCoverFields } from "./proposal-document-content";
import {
  embedPdfImage,
  getCoverIllustrationDisplaySize,
  loadCoverIllustration,
  loadPrimeLogo,
  parseImageDataUrl,
  placeholderImage,
  type ParsedImage,
} from "./cover-page-assets";
import { COVER_ILLUSTRATION_HEIGHT_PT } from "./cover-page.constants";
import {
  COVER_PRIME_LOGO_TOP_PT,
  COVER_PRIME_LOGO_WIDTH_PT,
} from "./cover-page.constants";

const MARGIN = 50;
const PAGE_W = 595.28;
const PAGE_H = 841.89;

type CoverCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  brand: RGB;
  text: RGB;
  muted: RGB;
};

function sanitize(s: string): string {
  return (s || "").replace(/[^\x20-\x7E]/g, "");
}

async function drawEmbeddedImage(
  ctx: CoverCtx,
  img: ParsedImage,
  x: number,
  y: number,
  width: number,
) {
  try {
    const embedded = await embedPdfImage(ctx.pdf, img);
    const height = (embedded.height / embedded.width) * width;
    ctx.page.drawImage(embedded, { x, y: y - height, width, height });
    return height;
  } catch {
    const fallback = placeholderImage(img.alt);
    const embedded = await embedPdfImage(ctx.pdf, fallback);
    const height = (embedded.height / embedded.width) * width;
    ctx.page.drawImage(embedded, { x, y: y - height, width, height });
    ctx.page.drawText(sanitize("Unable to load image"), {
      x: x + 4,
      y: y - height - 12,
      size: 7,
      font: ctx.font,
      color: ctx.muted,
    });
    ctx.page.drawText(sanitize(img.alt), {
      x: x + 4,
      y: y - height - 22,
      size: 8,
      font: ctx.bold,
      color: ctx.text,
    });
    return height + 24;
  }
}

export async function drawPdfCoverPage(ctx: CoverCtx, input: ProposalPreviewData): Promise<PDFPage> {
  const cover = getCoverFields(input);
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  const c: CoverCtx = { ...ctx, page };

  page.drawRectangle({
    x: MARGIN - 8,
    y: MARGIN - 8,
    width: PAGE_W - MARGIN * 2 + 16,
    height: PAGE_H - MARGIN * 2 + 16,
    borderColor: ctx.text,
    borderWidth: 1,
  });

  const topY = PAGE_H - COVER_PRIME_LOGO_TOP_PT;
  const primeW = COVER_PRIME_LOGO_WIDTH_PT;
  const primeH = await drawEmbeddedImage(c, loadPrimeLogo(), (PAGE_W - primeW) / 2, topY, primeW);

  let y = topY - primeH - 48;
  const title = "Business Proposal";
  page.drawText(title, {
    x: (PAGE_W - ctx.bold.widthOfTextAtSize(title, 22)) / 2,
    y,
    size: 22,
    font: ctx.bold,
    color: ctx.text,
  });
  y -= 28;

  const sub = sanitize(cover.serviceName);
  const subSize = 13;
  page.drawText(sub, {
    x: (PAGE_W - ctx.bold.widthOfTextAtSize(sub, subSize)) / 2,
    y,
    size: subSize,
    font: ctx.bold,
    color: ctx.text,
  });
  y -= 22;

  const date = sanitize(cover.proposalDate);
  page.drawText(date, {
    x: (PAGE_W - ctx.font.widthOfTextAtSize(date, 11)) / 2,
    y,
    size: 11,
    font: ctx.font,
    color: ctx.text,
  });

  y -= 24;
  const illustrationSize = getCoverIllustrationDisplaySize(COVER_ILLUSTRATION_HEIGHT_PT);
  await drawEmbeddedImage(
    c,
    loadCoverIllustration(),
    (PAGE_W - illustrationSize.width) / 2,
    y,
    illustrationSize.width,
  );

  const clientParsed = parseImageDataUrl(input.clientLogo, `${cover.clientName} logo`);
  if (clientParsed) {
    await drawEmbeddedImage(c, clientParsed, (PAGE_W - 120) / 2, MARGIN + 90, 120);
  } else {
    const name = sanitize(cover.clientName);
    page.drawText(name, {
      x: (PAGE_W - ctx.bold.widthOfTextAtSize(name, 16)) / 2,
      y: MARGIN + 36,
      size: 16,
      font: ctx.bold,
      color: ctx.brand,
    });
  }

  return page;
}
