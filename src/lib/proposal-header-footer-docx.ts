import {
  AlignmentType, BorderStyle, Footer, Header, HorizontalPositionAlign, HorizontalPositionRelativeFrom,
  ImageRun, Paragraph, Table, TableCell, TableRow,
  TextWrappingType,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import type { ProposalPreviewData } from "./proposal-preview";
import {
  getProposalFooterImage,
  getProposalHeaderImages,
  getProposalWatermarkImage,
} from "./proposal-header-footer.server";
import { getImageDimensions, scaleToFit, type ParsedImage } from "./cover-page-assets.server";
import {
  BODY_TOP_MARGIN_TWIPS,
  BRAND_HEX,
  CLIENT_LOGO_MAX_PX,
  DOCX_INCH,
  DOCX_MARGIN_LR,
  DOCX_PAGE_WIDTH,
  HEADER_LINE_AFTER_INCH,
  HEADER_LINE_GAP_INCH,
  HEADER_LOGO_SIDE_PAD_INNER_TWIPS,
  PAGE_WIDTH_PX,
  PRIME_LOGO_HEIGHT_PX,
  PRIME_LOGO_WIDTH_PX,
  WATERMARK_ALT,
  WATERMARK_MAX_WIDTH_FRACTION,
} from "./proposal-header-footer.constants";

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const LINE_GAP_DXA = Math.round(HEADER_LINE_GAP_INCH * DOCX_INCH);
const LINE_AFTER_DXA = Math.round(HEADER_LINE_AFTER_INCH * DOCX_INCH);

function headerImageCell(
  img: ParsedImage,
  widthPx: number,
  heightPx: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType],
  cellWidth: number,
) {
  return new TableCell({
    width: { size: cellWidth, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 0, bottom: 0, left: HEADER_LOGO_SIDE_PAD_INNER_TWIPS, right: HEADER_LOGO_SIDE_PAD_INNER_TWIPS },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            type: img.type,
            data: img.buffer,
            transformation: { width: widthPx, height: heightPx },
            altText: { title: img.alt, description: img.alt, name: img.alt },
          }),
        ],
      }),
    ],
  });
}

/** Body text starts 1" below page top — logos sit in the header band above. */
export function docxContentTopMargin() {
  return BODY_TOP_MARGIN_TWIPS;
}

function scaledClientLogoSize(img: ParsedImage) {
  const dims = getImageDimensions(img.buffer);
  return scaleToFit(dims.width, dims.height, CLIENT_LOGO_MAX_PX, CLIENT_LOGO_MAX_PX);
}

function buildDocxWatermarkParagraph() {
  const img = getProposalWatermarkImage();
  const dims = getImageDimensions(img.buffer);
  const watermarkW = Math.round(PAGE_WIDTH_PX * WATERMARK_MAX_WIDTH_FRACTION);
  const watermarkH = Math.max(1, Math.round(watermarkW * (dims.height / dims.width)));

  return new Paragraph({
    children: [
      new ImageRun({
        type: img.type,
        data: img.buffer,
        transformation: { width: watermarkW, height: watermarkH },
        altText: { title: WATERMARK_ALT, description: WATERMARK_ALT, name: WATERMARK_ALT },
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.PAGE,
            align: HorizontalPositionAlign.CENTER,
          },
          verticalPosition: {
            relative: VerticalPositionRelativeFrom.PAGE,
            align: VerticalPositionAlign.CENTER,
          },
          behindDocument: true,
          allowOverlap: true,
          wrap: { type: TextWrappingType.NONE },
        },
      }),
    ],
  });
}

export function buildDocxContentHeader(input: ProposalPreviewData) {
  const { prime, client } = getProposalHeaderImages(input);
  const clientSize = scaledClientLogoSize(client);
  return new Header({
    children: [
      buildDocxWatermarkParagraph(),
      new Table({
        width: { size: DOCX_PAGE_WIDTH - DOCX_MARGIN_LR * 2, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              headerImageCell(prime, PRIME_LOGO_WIDTH_PX, PRIME_LOGO_HEIGHT_PX, AlignmentType.LEFT, 4680),
              headerImageCell(client, clientSize.width, clientSize.height, AlignmentType.RIGHT, 4680),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: LINE_GAP_DXA, after: LINE_AFTER_DXA },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND_HEX, space: 1 },
        },
      }),
    ],
  });
}

export function buildDocxContentFooter() {
  const footer = getProposalFooterImage();
  const dims = getImageDimensions(footer.buffer);
  const footerW = PAGE_WIDTH_PX;
  const footerH = Math.max(1, Math.round(footerW * (dims.height / dims.width)));
  const footerH_dxa = Math.round((footerH / 96) * DOCX_INCH);

  return {
    footer: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0 },
          indent: { left: -DOCX_MARGIN_LR, right: -DOCX_MARGIN_LR },
          children: [
            new ImageRun({
              type: footer.type,
              data: footer.buffer,
              transformation: { width: footerW, height: footerH },
              altText: { title: footer.alt, description: footer.alt, name: footer.alt },
            }),
          ],
        }),
      ],
    }),
    bottomMargin: footerH_dxa + 40,
    footerDistance: 0,
  };
}
