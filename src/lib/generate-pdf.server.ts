import { PDFDocument, rgb, PDFPage, PDFFont } from "pdf-lib";
import type { ProposalPreviewData } from "./proposal-preview";
import { getCoverFields, WAPT_APPROACH_INTRO } from "./proposal-document-content";
import { getProposalSectionContent, hasCoverageMatrix, hasFilledMilestones, customSectionTitle, hasFilledText } from "./proposal-section-visibility";
import { drawPdfCoverPage } from "./cover-page-pdf";
import {
  drawPdfPageFooter,
  drawPdfPageHeader,
  drawPdfPageWatermark,
  pdfContentBottomLimit,
  pdfContentTopY,
  preparePdfChrome,
  type PdfChrome,
} from "./proposal-header-footer-pdf";
import { PROPOSAL_TERMS_AND_CONDITIONS_ITEMS } from "./wapt-template-sections";
import { plainTextField, decodeHtmlEntities, looksLikeHtml } from "./html-content";
import {
  buildCommercialsTableRows,
  COMMERCIALS_TABLE_HEADERS,
} from "./commercials-table";
import { drawPdfEndingContent } from "./ending-page-pdf";
import { embedProposalPdfFonts } from "./proposal-fonts.server";

const MARGIN = 50;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const BRAND = rgb(0.12, 0.31, 0.47);
const ACCENT = rgb(0.84, 0.91, 0.94);
const TEXT = rgb(0.15, 0.15, 0.15);
const MUTED = rgb(0.45, 0.45, 0.45);

type Ctx = {
  pdf: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
  clientName: string;
  chrome: PdfChrome;
  coverPageCount: number;
};

function newPage(ctx: Ctx) {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(page);
  ctx.page = page;
  drawPdfPageHeader(page, ctx.chrome);
  ctx.y = pdfContentTopY(ctx.chrome);
  return page;
}

function ensure(ctx: Ctx, need: number) {
  if (ctx.y - need < pdfContentBottomLimit(ctx.chrome)) newPage(ctx);
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      if (line) lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function sanitize(s: string): string {
  return (s || "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, "*")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF]/g, "");
}

function drawPlainText(ctx: Ctx, text: string, opts: { font?: PDFFont; size?: number; color?: any; indent?: number; gap?: number } = {}) {
  const plain = plainTextField(text);
  if (!plain) return;
  plain.split(/\n+/).filter(Boolean).forEach((line) => drawText(ctx, line, opts));
}

type InlineSeg = { text: string; bold: boolean };
type Token = { text: string; bold: boolean };

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
  return segments;
}

function tokenizeForWrap(segs: InlineSeg[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segs) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      tokens.push({ text: part, bold: seg.bold });
    }
  }
  return tokens;
}

function measureTokenWidth(token: Token, size: number, ctx: Ctx): number {
  const font = token.bold ? ctx.bold : ctx.font;
  return font.widthOfTextAtSize(token.text, size);
}

function wrapTokens(ctx: Ctx, tokens: Token[], size: number, maxW: number): Token[][] {
  const lines: Token[][] = [];
  let current: Token[] = [];
  let currentW = 0;

  for (const token of tokens) {
    // Skip leading whitespace at start of line
    if (current.length === 0 && /^\s+$/.test(token.text)) continue;

    const w = measureTokenWidth(token, size, ctx);
    if (current.length > 0 && currentW + w > maxW) {
      lines.push(current);
      current = [token];
      currentW = w;
    } else {
      current.push(token);
      currentW += w;
    }
  }

  if (current.length) lines.push(current);
  return lines;
}

function drawTokens(ctx: Ctx, tokens: Token[], opts: { x: number; indent?: number; size?: number; gapAfter?: number; color?: any }) {
  const size = opts.size ?? 10;
  const color = opts.color ?? TEXT;
  const maxW = PAGE_W - MARGIN * 2 - (opts.indent ?? 0);
  const lines = wrapTokens(ctx, tokens, size, maxW);

  for (const lineTokens of lines) {
    ensure(ctx, size + 2);
    let x = opts.x;
    const y = ctx.y - size;
    for (const token of lineTokens) {
      const font = token.bold ? ctx.bold : ctx.font;
      ctx.page.drawText(token.text, { x, y, size, font, color });
      x += font.widthOfTextAtSize(token.text, size);
    }
    ctx.y -= size + 4;
  }

  ctx.y -= opts.gapAfter ?? 2;
}

function drawRichText(ctx: Ctx, text: string) {
  if (!text?.trim()) return;
  if (!looksLikeHtml(text)) {
    drawPlainText(ctx, text);
    return;
  }

  const blockRe = /<(p|ul|ol|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let matched = false;

  for (const match of text.matchAll(blockRe)) {
    matched = true;
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === "ul" || tag === "ol") {
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const items = [...inner.matchAll(liRe)];
      items.forEach((liMatch, i) => {
        const liInner = liMatch[1] ?? "";
        const segs = htmlToInlineSegments(liInner);
        const tokensBase = tokenizeForWrap(segs);
        if (!tokensBase.length) return;

        const prefixToken = tag === "ol" ? [{ text: `${i + 1}. `, bold: false }] : [];
        const tokens = [...prefixToken, ...tokensBase];

        ensure(ctx, 14);
        ctx.page.drawText("*", { x: MARGIN, y: ctx.y - 10, size: 10, font: ctx.bold, color: BRAND });
        drawTokens(ctx, tokens, { x: MARGIN + 14, indent: 14, size: 10, gapAfter: 2, color: TEXT });
      });
      continue;
    }

    const segs = htmlToInlineSegments(inner);
    const tokens = tokenizeForWrap(segs);
    if (!tokens.length) continue;
    drawTokens(ctx, tokens, { x: MARGIN, indent: 0, size: 10, gapAfter: 2, color: TEXT });
  }

  if (!matched) {
    const segs = htmlToInlineSegments(text);
    const tokens = tokenizeForWrap(segs);
    if (tokens.length) drawTokens(ctx, tokens, { x: MARGIN, indent: 0, size: 10, gapAfter: 2, color: TEXT });
  }
}

function drawText(ctx: Ctx, text: string, opts: { font?: PDFFont; size?: number; color?: any; indent?: number; gap?: number } = {}) {
  const font = opts.font || ctx.font;
  const size = opts.size || 10;
  const indent = opts.indent || 0;
  const maxW = PAGE_W - MARGIN * 2 - indent;
  const lines = wrap(sanitize(text), font, size, maxW);
  for (const line of lines) {
    ensure(ctx, size + 2);
    ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y - size, size, font, color: opts.color || TEXT });
    ctx.y -= size + 4;
  }
  ctx.y -= opts.gap ?? 2;
}

function heading(ctx: Ctx, text: string, num?: number) {
  ctx.y -= 8;
  ensure(ctx, 24);
  const label = num != null ? `${num}. ${text}` : text;
  ctx.page.drawText(sanitize(label), { x: MARGIN, y: ctx.y - 14, size: 14, font: ctx.bold, color: BRAND });
  ctx.y -= 18;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.5, color: BRAND });
  ctx.y -= 10;
}

function subheading(ctx: Ctx, text: string) {
  ctx.y -= 6;
  ensure(ctx, 18);
  ctx.page.drawText(sanitize(text), { x: MARGIN, y: ctx.y - 12, size: 11, font: ctx.bold, color: BRAND });
  ctx.y -= 16;
}

function bullet(ctx: Ctx, text: string) {
  ensure(ctx, 14);
  ctx.page.drawText("*", { x: MARGIN, y: ctx.y - 10, size: 10, font: ctx.bold, color: BRAND });
  drawText(ctx, text, { indent: 14 });
}

function labeledBullet(ctx: Ctx, label: string | undefined, text: string) {
  ensure(ctx, 14);
  const size = 10;
  const indent = 14;
  const maxW = PAGE_W - MARGIN * 2 - indent;
  ctx.page.drawText("*", { x: MARGIN, y: ctx.y - size, size, font: ctx.bold, color: BRAND });
  if (!label) {
    drawText(ctx, text, { indent, size });
    return;
  }
  const prefix = sanitize(`${label}: `);
  const body = sanitize(text);
  const bodyLines = body.split(/\r?\n/).map((ln) => ln.trim()).filter(Boolean);
  const bodyForWrap = bodyLines.join(" ");
  const prefixW = ctx.bold.widthOfTextAtSize(prefix, size);
  const firstLineW = Math.max(40, maxW - prefixW);
  const words = bodyForWrap.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  let lineMaxW = firstLineW;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.font.widthOfTextAtSize(test, size) > lineMaxW && line) {
      lines.push(line);
      line = word;
      lineMaxW = maxW;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => {
    ensure(ctx, size + 2);
    const y = ctx.y - size;
    const x = MARGIN + indent;
    if (i === 0) {
      ctx.page.drawText(prefix, { x, y, size, font: ctx.bold, color: TEXT });
      ctx.page.drawText(ln, { x: x + prefixW, y, size, font: ctx.font, color: TEXT });
    } else {
      ctx.page.drawText(ln, { x, y, size, font: ctx.font, color: TEXT });
    }
    ctx.y -= size + 4;
  });
  // Render explicit extra lines from embedded \n
  bodyLines.slice(1).forEach((ln) => {
    drawText(ctx, ln, { indent, size, gap: 0 });
  });
  ctx.y -= 2;
}

function table(ctx: Ctx, headers: string[], rows: string[][]) {
  const cols = headers.length;
  const totalW = PAGE_W - MARGIN * 2;
  const colW = totalW / cols;
  const drawRow = (cells: string[], isHeader: boolean) => {
    const lineSets = cells.map((c) => wrap(sanitize(c ?? ""), isHeader ? ctx.bold : ctx.font, 9, colW - 8));
    const rowH = Math.max(...lineSets.map((l) => l.length)) * 12 + 8;
    ensure(ctx, rowH);
    if (isHeader) ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowH, width: totalW, height: rowH, color: ACCENT });
    lineSets.forEach((lines, i) => {
      lines.forEach((ln, j) => {
        ctx.page.drawText(ln, { x: MARGIN + i * colW + 4, y: ctx.y - 10 - j * 12, size: 9, font: isHeader ? ctx.bold : ctx.font, color: TEXT });
      });
    });
    for (let i = 0; i <= cols; i++) {
      ctx.page.drawLine({ start: { x: MARGIN + i * colW, y: ctx.y }, end: { x: MARGIN + i * colW, y: ctx.y - rowH }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
    }
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y - rowH }, end: { x: PAGE_W - MARGIN, y: ctx.y - rowH }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
    ctx.y -= rowH;
  };
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
  drawRow(headers, true);
  rows.forEach((r) => drawRow(r, false));
  ctx.y -= 8;
}

function drawCommercialsTable(ctx: Ctx, commercials: ProposalPreviewData["commercials"]) {
  const headers = [...COMMERCIALS_TABLE_HEADERS];
  const cols = headers.length;
  const totalW = PAGE_W - MARGIN * 2;
  const colW = totalW / cols;
  const rows = buildCommercialsTableRows(commercials);

  const drawCellsRow = (cells: string[], isHeader: boolean, opts?: { bold?: boolean }) => {
    const bodyFont = opts?.bold ? ctx.bold : ctx.font;
    const lineSets = cells.map((c) => wrap(sanitize(c ?? ""), isHeader ? ctx.bold : bodyFont, 9, colW - 8));
    const rowH = Math.max(...lineSets.map((l) => l.length)) * 12 + 8;
    ensure(ctx, rowH);
    if (isHeader) ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowH, width: totalW, height: rowH, color: ACCENT });
    lineSets.forEach((lines, i) => {
      lines.forEach((ln, j) => {
        ctx.page.drawText(ln, {
          x: MARGIN + i * colW + 4,
          y: ctx.y - 10 - j * 12,
          size: 9,
          font: isHeader ? ctx.bold : bodyFont,
          color: TEXT,
        });
      });
    });
    for (let i = 0; i <= cols; i++) {
      ctx.page.drawLine({
        start: { x: MARGIN + i * colW, y: ctx.y },
        end: { x: MARGIN + i * colW, y: ctx.y - rowH },
        thickness: 0.3,
        color: rgb(0.75, 0.75, 0.75),
      });
    }
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y - rowH },
      end: { x: PAGE_W - MARGIN, y: ctx.y - rowH },
      thickness: 0.3,
      color: rgb(0.75, 0.75, 0.75),
    });
    ctx.y -= rowH;
  };

  const drawMergedTotalRow = (label: string, amount: string, bold = false) => {
    const rowFont = bold ? ctx.bold : ctx.font;
    const mergedW = colW * 3;
    const labelLines = wrap(sanitize(label), rowFont, 9, mergedW - 8);
    const amountLines = wrap(sanitize(amount), rowFont, 9, colW - 8);
    const rowH = Math.max(labelLines.length, amountLines.length) * 12 + 8;
    ensure(ctx, rowH);

    labelLines.forEach((ln, j) => {
      ctx.page.drawText(ln, {
        x: MARGIN + 4,
        y: ctx.y - 10 - j * 12,
        size: 9,
        font: rowFont,
        color: TEXT,
      });
    });
    amountLines.forEach((ln, j) => {
      ctx.page.drawText(ln, {
        x: MARGIN + mergedW + 4,
        y: ctx.y - 10 - j * 12,
        size: 9,
        font: rowFont,
        color: TEXT,
      });
    });

    for (const x of [MARGIN, MARGIN + mergedW, PAGE_W - MARGIN]) {
      ctx.page.drawLine({
        start: { x, y: ctx.y },
        end: { x, y: ctx.y - rowH },
        thickness: 0.3,
        color: rgb(0.75, 0.75, 0.75),
      });
    }
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y - rowH },
      end: { x: PAGE_W - MARGIN, y: ctx.y - rowH },
      thickness: 0.3,
      color: rgb(0.75, 0.75, 0.75),
    });
    ctx.y -= rowH;
  };

  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.3,
    color: rgb(0.75, 0.75, 0.75),
  });
  drawCellsRow(headers, true);

  rows.forEach((row) => {
    if (row.kind === "line") {
      drawCellsRow([row.description, row.qty, row.rate, row.amount], false);
      return;
    }
    drawMergedTotalRow(row.label, row.amount, row.bold);
  });

  ctx.y -= 8;
}

function drawFooters(ctx: Ctx) {
  ctx.pages.forEach((page, idx) => {
    if (idx < ctx.coverPageCount) return;
    drawPdfPageWatermark(page, ctx.chrome);
    drawPdfPageFooter(page, ctx.chrome);
  });
}

export async function generateProposalPdf(input: ProposalPreviewData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const { font, bold } = await embedProposalPdfFonts(pdf);
  const chrome = await preparePdfChrome(pdf, input);
  const ctx: Ctx = {
    pdf, font, bold, pages: [], page: null as any, y: 0,
    clientName: input.clientName, chrome, coverPageCount: 1,
  };
  const cover = getCoverFields(input);
  const s = input.service;
  const content = getProposalSectionContent(input);
  const coverPage = await drawPdfCoverPage({ pdf, page: null as any, font, bold, brand: BRAND, text: TEXT, muted: MUTED }, input);
  ctx.pages.push(coverPage);
  ctx.page = coverPage;
  newPage(ctx);

  let n = 0;
  const sec = (t: string) => heading(ctx, t, ++n);
  let postDisclaimerPageBreak = false;
  const startPostDisclaimer = () => {
    if (!postDisclaimerPageBreak) {
      newPage(ctx);
      postDisclaimerPageBreak = true;
    }
  };

  sec("Statement of Confidentiality");
  drawText(ctx, cover.confidentiality);

  sec("Acknowledgment");
  drawText(ctx, cover.acknowledgment);

  sec("Disclaimer");
  drawText(ctx, cover.disclaimer);

  if (hasFilledText(content.executiveSummary)) {
    startPostDisclaimer();
    sec("Executive Summary");
    drawRichText(ctx, content.executiveSummary);
  }

  startPostDisclaimer();
  sec("Scope");
  drawRichText(ctx, content.overviewHtml);

  if (hasFilledText(content.projectObjectivesHtml)) {
    sec("Project Objectives");
    drawRichText(ctx, content.projectObjectivesHtml);
  }

  if (hasFilledText(content.expectedBenefitsHtml)) {
    sec("Expected Benefits");
    drawRichText(ctx, content.expectedBenefitsHtml);
  }

  if (content.scopeText) {
    sec("Scope of Engagement");
    drawPlainText(ctx, content.scopeText);
  }

  if (hasFilledText(content.deliverablesHtml)) {
    sec("Deliverables");
    drawRichText(ctx, content.deliverablesHtml);
  }

  if (hasFilledText(content.approachBody)) {
    sec("Approach & Methodology");
    drawText(ctx, WAPT_APPROACH_INTRO);
    drawRichText(ctx, content.approachBody);
  }

  if (hasCoverageMatrix(s)) {
    subheading(ctx, "OWASP TOP 10 (2021) Coverage");
    table(ctx, s.coverage_matrix.headers, s.coverage_matrix.rows);
  }

  if (content.timelineRows.length) {
    sec("Project Timeline");
    table(ctx, ["Phase", "Activity", "Duration"], content.timelineRows);
  }

  if (content.prerequisitesHtml) {
    sec("Prerequisites");
    drawRichText(ctx, content.prerequisitesHtml);
  }

  for (const customSection of content.customSections) {
    sec(customSectionTitle(customSection.title));
    drawRichText(ctx, customSection.content);
  }

  sec("Commercials");
  drawCommercialsTable(ctx, input.commercials);
  if (content.commercialsNotes) drawPlainText(ctx, content.commercialsNotes);

  if (hasFilledMilestones(content.milestones)) {
    sec("Payment Milestones");
    table(ctx, ["Milestone", "% of Total"], content.milestones.map((m) => [m.label, `${m.percent}%`]));
  }

  newPage(ctx);
  sec("Terms & Conditions");
  PROPOSAL_TERMS_AND_CONDITIONS_ITEMS.forEach((item) => labeledBullet(ctx, item.label, item.text));

  newPage(ctx);
  await drawPdfEndingContent({
    pdf: ctx.pdf,
    page: ctx.page,
    font: ctx.font,
    bold: ctx.bold,
    brand: BRAND,
    text: TEXT,
    chrome: ctx.chrome,
  });

  drawFooters(ctx);
  return await pdf.save();
}
