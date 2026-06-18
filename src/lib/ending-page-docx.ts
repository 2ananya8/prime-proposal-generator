import { AlignmentType, ImageRun, Paragraph, TextRun } from "docx";
import {
  getImageDimensions,
  loadContactUsIllustration,
  loadPrimeLogo,
  scaleToFit,
} from "./cover-page-assets";
import { PROPOSAL_FONT_NAME } from "./proposal-fonts.constants";
import { ENDING_COMPANY_NAME, ENDING_CONTACT_LINES } from "./proposal-ending-page";

export function buildDocxEndingPage(): Paragraph[] {
  const contact = loadContactUsIllustration();
  const primeLogo = loadPrimeLogo();
  const contactDims = getImageDimensions(contact.buffer);
  const logoDims = getImageDimensions(primeLogo.buffer);
  const contactSize = scaleToFit(contactDims.width, contactDims.height, 430, 430);
  const logoSize = scaleToFit(logoDims.width, logoDims.height, 220, 90);

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 500 },
      children: [
        new ImageRun({
          type: contact.type,
          data: contact.buffer,
          transformation: { width: contactSize.width, height: contactSize.height },
          altText: { title: contact.alt, description: contact.alt, name: contact.alt },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [new TextRun({ text: ENDING_COMPANY_NAME, bold: true, color: "1F4E79", size: 40, font: PROPOSAL_FONT_NAME })],
    }),
    ...ENDING_CONTACT_LINES.map((line) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 90 },
        children: [new TextRun({ text: line, size: 24, font: PROPOSAL_FONT_NAME })],
      }),
    ),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480 },
      children: [
        new ImageRun({
          type: primeLogo.type,
          data: primeLogo.buffer,
          transformation: { width: logoSize.width, height: logoSize.height },
          altText: { title: primeLogo.alt, description: primeLogo.alt, name: primeLogo.alt },
        }),
      ],
    }),
  ];
}
