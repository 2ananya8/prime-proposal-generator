import { rgb, type PDFDocument, type PDFImage, type PDFPage } from "pdf-lib";
import type { ProposalPreviewData } from "./proposal-preview";
import { embedPdfImage, scaleToFit } from "./cover-page-assets.server";
import {
  getProposalFooterImage,
  getProposalHeaderImages,
  getProposalWatermarkImage,
} from "./proposal-header-footer.server";
import {
  BODY_TOP_MARGIN_TWIPS,
  CLIENT_LOGO_MAX_INCH,
  DOCX_INCH,
  HEADER_LINE_GAP_INCH,
  HEADER_LOGO_TOP_INCH,
  HEADER_LINE_SIDE_PAD_INCH,
  HEADER_LOGO_SIDE_PAD_INCH,
  PDF_INCH,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PRIME_LOGO_HEIGHT_INCH,
  PRIME_LOGO_WIDTH_INCH,
  PDF_WATERMARK_OPACITY,
  WATERMARK_MAX_WIDTH_FRACTION,
} from "./proposal-header-footer.constants";

const HEADER_TOP_PT = HEADER_LOGO_TOP_INCH * PDF_INCH;
const PRIME_H_PT = PRIME_LOGO_HEIGHT_INCH * PDF_INCH;
const PRIME_W_PT = PRIME_LOGO_WIDTH_INCH * PDF_INCH;
const CLIENT_MAX_PT = CLIENT_LOGO_MAX_INCH * PDF_INCH;
const LINE_GAP_PT = HEADER_LINE_GAP_INCH * PDF_INCH;
const LOGO_SIDE_PAD_PT = HEADER_LOGO_SIDE_PAD_INCH * PDF_INCH;
const LINE_SIDE_PAD_PT = HEADER_LINE_SIDE_PAD_INCH * PDF_INCH;
const BODY_TOP_PT = (BODY_TOP_MARGIN_TWIPS / DOCX_INCH) * PDF_INCH;
const BRAND = rgb(0.12, 0.31, 0.47);

export type PdfChrome = {
  primeEmb: PDFImage;
  clientEmb: PDFImage;
  clientW: number;
  clientH: number;
  footerEmb: PDFImage;
  footerH: number;
  watermarkEmb: PDFImage;
  watermarkW: number;
  watermarkH: number;
};

export async function preparePdfChrome(pdf: PDFDocument, input: ProposalPreviewData): Promise<PdfChrome> {
  const { prime, client } = getProposalHeaderImages(input);
  const footer = getProposalFooterImage();
  const watermark = getProposalWatermarkImage();
  const primeEmb = await embedPdfImage(pdf, prime);
  const clientEmb = await embedPdfImage(pdf, client);
  const footerEmb = await embedPdfImage(pdf, footer);
  const watermarkEmb = await embedPdfImage(pdf, watermark);
  const footerH = PDF_PAGE_W * (footerEmb.height / footerEmb.width);
  const clientSize = scaleToFit(clientEmb.width, clientEmb.height, CLIENT_MAX_PT, CLIENT_MAX_PT);
  const watermarkW = PDF_PAGE_W * WATERMARK_MAX_WIDTH_FRACTION;
  const watermarkH = watermarkW * (watermarkEmb.height / watermarkEmb.width);

  return {
    primeEmb,
    clientEmb,
    clientW: clientSize.width,
    clientH: clientSize.height,
    footerEmb,
    footerH,
    watermarkEmb,
    watermarkW,
    watermarkH,
  };
}

export function drawPdfPageHeader(page: PDFPage, chrome: PdfChrome) {
  const logoTop = PDF_PAGE_H - HEADER_TOP_PT;

  page.drawImage(chrome.primeEmb, {
    x: LOGO_SIDE_PAD_PT,
    y: logoTop - PRIME_H_PT,
    width: PRIME_W_PT,
    height: PRIME_H_PT,
  });
  page.drawImage(chrome.clientEmb, {
    x: PDF_PAGE_W - LOGO_SIDE_PAD_PT - chrome.clientW,
    y: logoTop - chrome.clientH,
    width: chrome.clientW,
    height: chrome.clientH,
  });

  const lineY = logoTop - Math.max(PRIME_H_PT, chrome.clientH) - LINE_GAP_PT;
  page.drawLine({
    start: { x: LINE_SIDE_PAD_PT, y: lineY },
    end: { x: PDF_PAGE_W - LINE_SIDE_PAD_PT, y: lineY },
    thickness: 0.75,
    color: BRAND,
  });
}

export function drawPdfPageFooter(page: PDFPage, chrome: PdfChrome) {
  page.drawImage(chrome.footerEmb, {
    x: 0,
    y: 0,
    width: PDF_PAGE_W,
    height: chrome.footerH,
  });
}

/** Drawn after page content so the watermark stays visible (not buried under text/tables). */
export function drawPdfPageWatermark(page: PDFPage, chrome: PdfChrome) {
  page.drawImage(chrome.watermarkEmb, {
    x: (PDF_PAGE_W - chrome.watermarkW) / 2,
    y: (PDF_PAGE_H - chrome.watermarkH) / 2,
    width: chrome.watermarkW,
    height: chrome.watermarkH,
    opacity: PDF_WATERMARK_OPACITY,
  });
}

export function pdfContentTopY(_chrome: PdfChrome) {
  return PDF_PAGE_H - BODY_TOP_PT;
}

export function pdfContentBottomLimit(chrome: PdfChrome) {
  return chrome.footerH + 10;
}
