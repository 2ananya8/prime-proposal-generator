import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import { PDFDocument } from "pdf-lib";
import {
  embedPdfImage,
  loadContactUsIllustration,
  loadPrimeLogo,
} from "./cover-page-assets";
import { pdfContentBottomLimit, pdfContentTopY, type PdfChrome } from "./proposal-header-footer-pdf";
import { PDF_PAGE_W } from "./proposal-header-footer.constants";
import { ENDING_COMPANY_NAME, ENDING_CONTACT_LINES } from "./proposal-ending-page";

function sanitize(s: string): string {
  return (s || "").replace(/[^\x20-\x7E]/g, "");
}

type EndingCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  brand: RGB;
  text: RGB;
  chrome: PdfChrome;
};

export async function drawPdfEndingContent(ctx: EndingCtx) {
  const contact = loadContactUsIllustration();
  const logo = loadPrimeLogo();
  const contactImage = await embedPdfImage(ctx.pdf, contact);
  const logoImage = await embedPdfImage(ctx.pdf, logo);

  const topY = pdfContentTopY(ctx.chrome);
  const bottomY = pdfContentBottomLimit(ctx.chrome);
  const contentH = topY - bottomY;

  const companySize = 20;
  const lineSize = 11;
  const lineGap = 18;
  const blockGap = 24;

  let logoW = 150;
  let logoH = logoW * (logoImage.height / logoImage.width);
  const textBlockH =
    companySize +
    blockGap +
    ENDING_CONTACT_LINES.length * lineGap +
    blockGap +
    logoH;

  let contactW = 280;
  let contactH = contactW * (contactImage.height / contactImage.width);

  const maxBlockH = contentH - 16;
  let blockH = contactH + blockGap + textBlockH;
  if (blockH > maxBlockH) {
    const allowedContactH = Math.max(80, maxBlockH - blockGap - textBlockH);
    const scale = allowedContactH / contactH;
    contactW *= scale;
    contactH *= scale;
    blockH = contactH + blockGap + textBlockH;
  }

  const blockBottom = bottomY + (contentH - blockH) / 2;
  let y = blockBottom + blockH;

  y -= contactH;
  ctx.page.drawImage(contactImage, {
    x: (PDF_PAGE_W - contactW) / 2,
    y,
    width: contactW,
    height: contactH,
  });

  y -= blockGap;
  y -= companySize;
  ctx.page.drawText(ENDING_COMPANY_NAME, {
    x: (PDF_PAGE_W - ctx.bold.widthOfTextAtSize(ENDING_COMPANY_NAME, companySize)) / 2,
    y,
    size: companySize,
    font: ctx.bold,
    color: ctx.brand,
  });

  y -= blockGap;
  ENDING_CONTACT_LINES.forEach((line) => {
    y -= lineGap;
    const safe = sanitize(line);
    ctx.page.drawText(safe, {
      x: (PDF_PAGE_W - ctx.font.widthOfTextAtSize(safe, lineSize)) / 2,
      y,
      size: lineSize,
      font: ctx.font,
      color: ctx.text,
    });
  });

  y -= blockGap;
  y -= logoH;
  ctx.page.drawImage(logoImage, {
    x: (PDF_PAGE_W - logoW) / 2,
    y,
    width: logoW,
    height: logoH,
  });
}
