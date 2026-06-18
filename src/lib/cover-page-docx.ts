import {
  AlignmentType, ImageRun, Paragraph, TextRun,
} from "docx";
import type { ProposalPreviewData } from "./proposal-preview";
import { getCoverFields } from "./proposal-document-content";
import {
  loadCoverIllustration,
  loadPrimeLogo,
  getCoverIllustrationDisplaySize,
  getImageDimensions,
  parseImageDataUrl,
  placeholderImage,
  scaleToFit,
  type ParsedImage,
} from "./cover-page-assets.server";
import {
  COVER_ILLUSTRATION_HEIGHT_PX,
  COVER_PRIME_LOGO_HEIGHT_PX,
  COVER_PRIME_LOGO_TOP_TWIPS,
  COVER_PRIME_LOGO_WIDTH_PX,
} from "./cover-page.constants";

import { PROPOSAL_FONT_NAME } from "./proposal-fonts.constants";

const BRAND = "1F4E79";

/** One Word paragraph = one independently selectable image element. */
function standaloneImageParagraph(
  img: ParsedImage,
  width: number,
  height: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER,
  spacingBefore = 0,
) {
  return new Paragraph({
    alignment: align,
    spacing: { before: spacingBefore, after: 0 },
    children: [
      new ImageRun({
        type: img.type,
        data: img.buffer,
        transformation: { width, height },
        altText: {
          title: img.alt,
          description: img.alt,
          name: img.alt,
        },
      }),
    ],
  });
}

function safeClientLogo(dataUrl: string | null | undefined, clientName: string): ParsedImage {
  const parsed = parseImageDataUrl(dataUrl, `${clientName} logo`);
  return parsed ?? placeholderImage(`${clientName} logo`);
}

export function buildDocxCoverPage(input: ProposalPreviewData): Paragraph[] {
  const cover = getCoverFields(input);
  const primeLogo = loadPrimeLogo();
  const illustration = loadCoverIllustration();
  const illustrationSize = getCoverIllustrationDisplaySize(COVER_ILLUSTRATION_HEIGHT_PX);
  const clientLogo = input.clientLogo
    ? safeClientLogo(input.clientLogo, cover.clientName)
    : null;

  const blocks: Paragraph[] = [
    standaloneImageParagraph(
      primeLogo,
      COVER_PRIME_LOGO_WIDTH_PX,
      COVER_PRIME_LOGO_HEIGHT_PX,
      AlignmentType.CENTER,
      COVER_PRIME_LOGO_TOP_TWIPS,
    ),
    new Paragraph({ spacing: { before: 500 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Business Proposal", bold: true, size: 48, font: PROPOSAL_FONT_NAME })],
      spacing: { after: 160 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: cover.serviceName, bold: true, size: 28, font: PROPOSAL_FONT_NAME })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: cover.proposalDate, size: 24, font: PROPOSAL_FONT_NAME })],
      spacing: { after: 240 },
    }),
    standaloneImageParagraph(
      illustration,
      illustrationSize.width,
      illustrationSize.height,
      AlignmentType.CENTER,
    ),
    new Paragraph({ spacing: { before: 400 } }),
  ];

  if (clientLogo) {
    const clientDims = getImageDimensions(clientLogo.buffer);
    const clientSize = scaleToFit(clientDims.width, clientDims.height, 180, 72);
    blocks.push(standaloneImageParagraph(clientLogo, clientSize.width, clientSize.height, AlignmentType.CENTER));
  } else {
    blocks.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [new TextRun({ text: cover.clientName, bold: true, size: 32, color: BRAND, font: PROPOSAL_FONT_NAME })],
    }));
  }

  return blocks;
}
