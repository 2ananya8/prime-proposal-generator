import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageOrientation, LevelFormat,
} from "docx";
import { buildDocxContentFooter, buildDocxContentHeader, docxContentTopMargin } from "./proposal-header-footer-docx";
import { HEADER_DISTANCE_TWIPS } from "./proposal-header-footer.constants";
import type { ProposalPreviewData } from "./proposal-preview";
import { getCoverFields, WAPT_APPROACH_INTRO } from "./proposal-document-content";
import { buildDocxCoverPage } from "./cover-page-docx";
import { buildDocxEndingPage } from "./ending-page-docx";
import { PROPOSAL_TERMS_AND_CONDITIONS_ITEMS } from "./wapt-template-sections";
import { plainTextField, decodeHtmlEntities } from "./html-content";
import { getProposalSectionContent, hasCoverageMatrix, hasFilledMilestones, customSectionTitle, hasFilledText } from "./proposal-section-visibility";
import {
  buildCommercialsTableRows,
  COMMERCIALS_TABLE_HEADERS,
} from "./commercials-table";

import { PROPOSAL_FONT_NAME } from "./proposal-fonts.constants";

const BRAND = "1F4E79";
const ACCENT = "D5E8F0";

const p = (text: string, opts: { bold?: boolean; size?: number; color?: string; align?: any; preserve?: boolean } = {}) =>
  new Paragraph({
    alignment: opts.align,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color, font: PROPOSAL_FONT_NAME })],
    spacing: { after: 120 },
  });

const pre = (text: string) =>
  new Paragraph({
    children: [new TextRun({ text, font: PROPOSAL_FONT_NAME, size: 22 })],
    spacing: { after: 120 },
  });

const h = (text: string, level: 1 | 2 | 3 = 1) =>
  new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, color: BRAND, font: PROPOSAL_FONT_NAME, size: level === 1 ? 32 : level === 2 ? 26 : 22 })],
    spacing: { before: 240, after: 120 },
  });

const bullet = (text: string) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: PROPOSAL_FONT_NAME, size: 22 })],
    spacing: { after: 80 },
  });

const preBlocks = (text: string) => {
  const plain = plainTextField(text);
  if (!plain) return [];
  return plain.split(/\n+/).filter(Boolean).map((line) => pre(line));
};

type InlineSeg = { text: string; bold: boolean };

function stripTagsKeepText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ""));
}

function htmlToInlineSegments(html: string): InlineSeg[] {
  const segments: InlineSeg[] = [];
  const re = /<\s*(strong|b)\s*>([\s\S]*?)<\/\s*\1\s*>/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null = null;

  while ((m = re.exec(html))) {
    const start = m.index;
    if (start > lastIndex) {
      const before = html.slice(lastIndex, start);
      const txt = stripTagsKeepText(before);
      if (txt) segments.push({ text: txt, bold: false });
    }
    const strongInner = m[2] ?? "";
    const strongTxt = stripTagsKeepText(strongInner);
    if (strongTxt) segments.push({ text: strongTxt, bold: true });
    lastIndex = start + m[0].length;
  }

  if (lastIndex < html.length) {
    const tail = html.slice(lastIndex);
    const txt = stripTagsKeepText(tail);
    if (txt) segments.push({ text: txt, bold: false });
  }

  return segments.filter((s) => s.text.length > 0);
}

function inlineSegmentsToRuns(segs: InlineSeg[], fontSize = 22) {
  return segs.map((seg) => new TextRun({ text: seg.text, bold: seg.bold, font: PROPOSAL_FONT_NAME, size: fontSize }));
}

function richHtmlToDocxParagraphs(html: string): Paragraph[] {
  if (!html?.trim()) return [];

  const blocks: Paragraph[] = [];
  const blockRe = /<(p|ul|ol|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let matched = false;

  for (const match of html.matchAll(blockRe)) {
    matched = true;
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === "ul" || tag === "ol") {
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const items = [...inner.matchAll(liRe)];
      items.forEach((liMatch, i) => {
        const liInner = liMatch[1] ?? "";
        const segs = htmlToInlineSegments(liInner);
        if (!segs.length) return;
        const children =
          tag === "ol"
            ? [
              new TextRun({ text: `${i + 1}. `, bold: false, font: PROPOSAL_FONT_NAME, size: 22 }),
              ...inlineSegmentsToRuns(segs, 22),
            ]
            : inlineSegmentsToRuns(segs, 22);

        blocks.push(
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children,
            spacing: { after: 80 },
          }),
        );
      });
      continue;
    }

    // <p> or <h#> -> paragraph
    const segs = htmlToInlineSegments(inner);
    if (!segs.length) continue;
    blocks.push(
      new Paragraph({
        children: inlineSegmentsToRuns(segs, 22),
        spacing: { after: 120 },
      }),
    );
  }

  if (!matched) {
    const segs = htmlToInlineSegments(html);
    if (!segs.length) return [];
    return [new Paragraph({ children: inlineSegmentsToRuns(segs, 22), spacing: { after: 120 } })];
  }

  return blocks;
}

const richTextBlocks = (text: string) => richHtmlToDocxParagraphs(text);

const labeledBullet = (label: string | undefined, text: string) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: (() => {
      const lines = String(text ?? "").split(/\r?\n/);
      const lineRuns = lines.flatMap((line, i) => [
        new TextRun({ text: line, font: PROPOSAL_FONT_NAME, size: 22 }),
        ...(i < lines.length - 1 ? [new TextRun({ break: 1, text: "", font: PROPOSAL_FONT_NAME, size: 22 })] : []),
      ]);
      return label
        ? [
            new TextRun({ text: `${label}: `, bold: true, font: PROPOSAL_FONT_NAME, size: 22 }),
            ...lineRuns,
          ]
        : lineRuns;
    })(),
    spacing: { after: 80 },
  });

const cell = (text: string, opts: { bold?: boolean; shade?: boolean; width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) => {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: { top: border, bottom: border, left: border, right: border },
    shading: opts.shade ? { fill: ACCENT, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, font: PROPOSAL_FONT_NAME, size: 20 })],
    })],
  });
};

function buildCommercialsTable(commercials: ProposalPreviewData["commercials"], totalWidth = 9360) {
  const headers = [...COMMERCIALS_TABLE_HEADERS];
  const colW = Math.floor(totalWidth / headers.length);
  const widths = headers.map(() => colW);
  const rows = buildCommercialsTableRows(commercials);

  const bodyRows = rows.map((row) => {
    if (row.kind === "line") {
      return new TableRow({
        children: [
          cell(row.description, { width: widths[0] }),
          cell(row.qty, { width: widths[1] }),
          cell(row.rate, { width: widths[2] }),
          cell(row.amount, { width: widths[3] }),
        ],
      });
    }
    const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          width: { size: colW * 3, type: WidthType.DXA },
          borders: { top: border, bottom: border, left: border, right: border },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: row.label, bold: row.bold, font: PROPOSAL_FONT_NAME, size: 20 })],
          })],
        }),
        cell(row.amount, { width: widths[3], bold: row.bold }),
      ],
    });
  });

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((hd, i) => cell(hd, { bold: true, shade: true, width: widths[i] })),
      }),
      ...bodyRows,
    ],
  });
}

function buildTable(headers: string[], rows: string[][], totalWidth = 9360) {
  const colW = Math.floor(totalWidth / headers.length);
  const widths = headers.map(() => colW);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((hd, i) => cell(hd, { bold: true, shade: true, width: widths[i] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c ?? "", { width: widths[i] })) })),
    ],
  });
}

export async function generateProposalDocx(input: ProposalPreviewData): Promise<Uint8Array> {
  const { clientName, service, commercials } = input;
  const cover = getCoverFields(input);
  const content = getProposalSectionContent(input);

  const coverPage = buildDocxCoverPage(input);

  const sections: (Paragraph | Table)[] = [];
  let n = 0;
  const section = (title: string) => { n += 1; sections.push(h(`${n}. ${title}`, 1)); };
  let postDisclaimerPageBreak = false;
  const startPostDisclaimer = () => {
    if (!postDisclaimerPageBreak) {
      sections.push(new Paragraph({ pageBreakBefore: true }));
      postDisclaimerPageBreak = true;
    }
  };

  section("Statement of Confidentiality");
  sections.push(pre(cover.confidentiality));

  section("Acknowledgment");
  sections.push(pre(cover.acknowledgment));

  section("Disclaimer");
  sections.push(pre(cover.disclaimer));

  if (hasFilledText(content.executiveSummary)) {
    startPostDisclaimer();
    section("Executive Summary");
    sections.push(...richTextBlocks(content.executiveSummary));
  }

  startPostDisclaimer();
  section("Scope");
  sections.push(...richTextBlocks(content.overviewHtml));

  if (hasFilledText(content.projectObjectivesHtml)) {
    section("Project Objectives");
    sections.push(...richTextBlocks(content.projectObjectivesHtml));
  }

  if (hasFilledText(content.expectedBenefitsHtml)) {
    section("Expected Benefits");
    sections.push(...richTextBlocks(content.expectedBenefitsHtml));
  }

  if (content.scopeText) {
    section("Scope of Engagement");
    sections.push(...preBlocks(content.scopeText));
  }

  if (hasFilledText(content.deliverablesHtml)) {
    section("Deliverables");
    sections.push(...richTextBlocks(content.deliverablesHtml));
  }

  if (hasFilledText(content.approachBody)) {
    section("Approach & Methodology");
    sections.push(pre(WAPT_APPROACH_INTRO));
    sections.push(...richTextBlocks(content.approachBody));
  }

  if (hasCoverageMatrix(service)) {
    sections.push(h("OWASP TOP 10 (2021) Coverage", 3));
    sections.push(buildTable(service.coverage_matrix.headers, service.coverage_matrix.rows));
  }

  if (content.timelineRows.length) {
    section("Project Timeline");
    sections.push(buildTable(["Phase", "Activity", "Duration"], content.timelineRows));
  }

  if (content.prerequisitesHtml) {
    section("Prerequisites");
    sections.push(...richTextBlocks(content.prerequisitesHtml));
  }

  for (const sec of content.customSections) {
    section(customSectionTitle(sec.title));
    sections.push(...richTextBlocks(sec.content));
  }

  section("Commercials");
  sections.push(buildCommercialsTable(commercials));
  if (content.commercialsNotes) sections.push(...preBlocks(content.commercialsNotes));

  if (hasFilledMilestones(content.milestones)) {
    section("Payment Milestones");
    sections.push(buildTable(
      ["Milestone", "% of Total"],
      content.milestones.map((m) => [m.label, `${m.percent}%`]),
    ));
  }

  sections.push(new Paragraph({ pageBreakBefore: true }));
  section("Terms & Conditions");
  PROPOSAL_TERMS_AND_CONDITIONS_ITEMS.forEach((item) => sections.push(labeledBullet(item.label, item.text)));

  sections.push(new Paragraph({ pageBreakBefore: true }));
  sections.push(...buildDocxEndingPage());

  const doc = new Document({
    creator: "Prime Infoserv",
    title: `${service.name} Proposal — ${clientName}`,
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    styles: { default: { document: { run: { font: PROPOSAL_FONT_NAME, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: coverPage,
      },
      (() => {
        const { footer, bottomMargin, footerDistance } = buildDocxContentFooter();
        return {
          properties: {
            page: {
              size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
              margin: {
                top: docxContentTopMargin(),
                right: 1080,
                bottom: bottomMargin,
                left: 1080,
                header: HEADER_DISTANCE_TWIPS,
                footer: footerDistance,
              },
            },
          },
          headers: { default: buildDocxContentHeader(input) },
          footers: { default: footer },
          children: sections,
        };
      })(),
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
