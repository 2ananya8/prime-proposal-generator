import { htmlToPlainText } from "./html-content";
import { setListFieldHtml } from "./service-field-helpers";
import type { ServiceFormValue } from "@/components/ServiceForm"; // type-only — safe with ServiceForm

/** One subheading + its formatted body from the uploaded document. */
export type TemplateSection = {
  title: string;
  normalizedTitle: string;
  /** HTML preserving bold, lists, and paragraph breaks. */
  html: string;
};

/** Service form fields that template headings can map to. */
export type ServiceFieldKey =
  | "executive_summary_template"
  | "project_objectives"
  | "expected_benefits"
  | "approach_methodology"
  | "deliverables"
  | "prerequisites"
  | "timeline_phases";

export type ParsedTemplateDocument = {
  /** Every content section read from the file (excludes skipped boilerplate). */
  sections: TemplateSection[];
  /** Sections mapped to a known service form field. */
  byField: Partial<Record<ServiceFieldKey, TemplateSection>>;
  /** Sections with no matching form field (become custom sections). */
  unmatched: TemplateSection[];
  sourceFormat: "docx" | "txt";
};

/** File picker accept string — .txt and .docx only. */
export const TEMPLATE_FILE_ACCEPT =
  ".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_TEMPLATE_EXTENSIONS = [".txt", ".docx"] as const;

export function isAllowedTemplateFile(file: Pick<File, "name">): boolean {
  const lower = file.name.toLowerCase();
  return ALLOWED_TEMPLATE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function assertAllowedTemplateFile(file: File): ".txt" | ".docx" {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".docx")) return ".docx";
  if (lower.endsWith(".txt")) return ".txt";
  throw new Error("Only .txt and .docx files are allowed.");
}

function assertDocxZipHeader(buffer: ArrayBuffer): void {
  const bytes = new Uint8Array(buffer);
  // DOCX is a ZIP archive (PK..)
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("Invalid .docx file.");
  }
}

const FIELD_MAP: { keys: string[]; field: ServiceFieldKey }[] = [
  { keys: ["executive summary", "exec summary"], field: "executive_summary_template" },
  { keys: ["project objective", "objectives", "project goal"], field: "project_objectives" },
  { keys: ["expected benefit", "key benefit", "benefits"], field: "expected_benefits" },
  {
    keys: ["approach & methodology", "approach and methodology", "testing methodology", "methodology", "approach"],
    field: "approach_methodology",
  },
  { keys: ["deliverable", "deliverables", "key deliverable"], field: "deliverables" },
  { keys: ["prerequisite", "prerequisites", "prerequisites & dependencies"], field: "prerequisites" },
  { keys: ["project timeline", "engagement timeline", "timeline", "schedule"], field: "timeline_phases" },
];

/** Standard proposal boilerplate — read but not mapped or added as custom sections. */
const SKIP_TITLES = [
  "statement of confidentiality",
  "acknowledgment",
  "acknowledgement",
  "disclaimer",
  "terms & conditions",
  "terms and conditions",
  "commercials",
  "payment milestone",
  "project overview",
  "scope of engagement",
];

const MAMMOTH_STYLE_MAP = [
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='heading 1'] => h2:fresh",
  "p[style-name='heading 2'] => h2:fresh",
  "p[style-name='heading 3'] => h3:fresh",
];

export const SERVICE_FIELD_LABELS: Record<ServiceFieldKey, string> = {
  executive_summary_template: "Executive Summary Template",
  project_objectives: "Project Objectives",
  expected_benefits: "Expected Benefits",
  approach_methodology: "Approach & Methodology",
  deliverables: "Deliverables",
  prerequisites: "Prerequisites",
  timeline_phases: "Default Timeline Phases",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeSectionTitle(title: string): string {
  return title
    .trim()
    .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
    .replace(/:$/, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function shouldSkipTitle(title: string): boolean {
  const t = normalizeSectionTitle(title);
  return SKIP_TITLES.some((s) => t === s || t.includes(s));
}

function matchField(title: string): ServiceFieldKey | null {
  const t = normalizeSectionTitle(title);
  if (shouldSkipTitle(t)) return null;
  for (const { keys, field } of FIELD_MAP) {
    if (keys.some((k) => t === k || t.includes(k))) return field;
  }
  return null;
}

function isPrerequisiteSubheading(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^from\s+(prime|client|customer)/i.test(t);
}

function isLikelyHeading(plain: string): boolean {
  const t = plain.trim();
  if (!t || t.length > 120) return false;
  if (shouldSkipTitle(t)) return t.length < 90;
  if (/^\d+(?:\.\d+)*\.?\s+\S/.test(t)) return true;
  if (t === t.toUpperCase() && t.length > 3 && t.length < 80) return true;
  const lower = t.toLowerCase();
  const known = [
    "executive summary", "project objective", "objective", "benefit", "approach",
    "methodology", "deliverable", "prerequisite", "timeline", "schedule",
  ];
  return known.some((k) => lower.startsWith(k) || lower === k) && t.length < 90;
}

function splitHtmlBlocks(html: string): string[] {
  const trimmed = html.trim();
  if (!trimmed) return [];
  if (typeof DOMParser === "undefined") return [trimmed];

  const doc = new DOMParser().parseFromString(`<div>${trimmed}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return [trimmed];
  return Array.from(root.children).map((el) => el.outerHTML);
}

function headingFromBlock(blockHtml: string): string | null {
  const trimmed = blockHtml.trim();
  if (!trimmed || typeof DOMParser === "undefined") return null;

  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const el = doc.body.firstElementChild;
  if (!el) return null;

  const plain = (el.textContent ?? "").trim();
  if (!plain) return null;

  if (/^H[1-6]$/i.test(el.tagName)) return plain.replace(/:$/, "");

  if (el.tagName === "P") {
    const strongOnly = el.querySelector("strong, b");
    if (strongOnly && plain.length < 120) {
      const strongText = (strongOnly.textContent ?? "").trim();
      if (strongText.length >= plain.length * 0.7 && isLikelyHeading(plain)) {
        return plain.replace(/:$/, "");
      }
    }
    if (isLikelyHeading(plain)) return plain.replace(/:$/, "");
  }

  return null;
}

function cleanHtml(html: string): string {
  return html.replace(/<p>\s*<\/p>/gi, "").trim();
}

function plainLinesToHtml(text: string): string {
  const lines = text.split(/\n/);
  const parts: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    parts.push(`<ul>${bullets.map((b) => `<li><p>${escapeHtml(b)}</p></li>`).join("")}</ul>`);
    bullets = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    const bullet = t.match(/^[\s•*\-–—]+\s+(.+)$/) || t.match(/^\d+\.\s+(.+)$/);
    if (bullet) bullets.push(bullet[1]);
    else { flush(); parts.push(`<p>${escapeHtml(t)}</p>`); }
  }
  flush();
  return parts.join("");
}

function splitIntoSections(html: string): TemplateSection[] {
  const blocks = splitHtmlBlocks(html);
  const sections: TemplateSection[] = [];
  let title = "";
  let body: string[] = [];
  let inPrerequisites = false;

  const flush = () => {
    if (!title) { body = []; return; }
    const sectionHtml = cleanHtml(body.join(""));
    if (sectionHtml) {
      sections.push({
        title,
        normalizedTitle: normalizeSectionTitle(title),
        html: sectionHtml,
      });
    }
    body = [];
  };

  for (const block of blocks) {
    const heading = headingFromBlock(block);
    const plain = htmlToPlainText(block).trim();
    const prereqSub = (heading && isPrerequisiteSubheading(heading)) || isPrerequisiteSubheading(plain);

    if (heading && !(inPrerequisites && prereqSub)) {
      flush();
      title = heading;
      inPrerequisites = normalizeSectionTitle(title).includes("prerequisite");
      continue;
    }

    if (!title || shouldSkipTitle(title)) {
      if (heading) title = "";
      continue;
    }

    if (inPrerequisites && prereqSub) {
      body.push(block);
      continue;
    }

    body.push(block);
  }
  flush();

  return sections.filter((s) => !shouldSkipTitle(s.title));
}

function splitPlainTextSections(text: string): TemplateSection[] {
  const lines = text.split(/\n/);
  const sections: TemplateSection[] = [];
  let title = "";
  let body: string[] = [];
  let inPrerequisites = false;

  const flush = () => {
    if (!title || shouldSkipTitle(title)) { body = []; return; }
    const content = body.join("\n").trim();
    if (content) {
      sections.push({
        title,
        normalizedTitle: normalizeSectionTitle(title),
        html: plainLinesToHtml(content),
      });
    }
    body = [];
  };

  for (const line of lines) {
    const t = line.trim();
    const isHeading = t && isLikelyHeading(t);
    const prereqSub = t && isPrerequisiteSubheading(t);

    if (isHeading && !(inPrerequisites && prereqSub)) {
      flush();
      title = t.replace(/:$/, "");
      inPrerequisites = normalizeSectionTitle(title).includes("prerequisite");
    } else if (title && !shouldSkipTitle(title)) {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function assignSections(sections: TemplateSection[], sourceFormat: ParsedTemplateDocument["sourceFormat"]): ParsedTemplateDocument {
  const byField: Partial<Record<ServiceFieldKey, TemplateSection>> = {};
  const unmatched: TemplateSection[] = [];

  for (const section of sections) {
    if (!section.html.trim()) continue;

    const field = matchField(section.title);
    if (field) {
      if (!byField[field]) byField[field] = section;
      continue;
    }

    if (section.html.trim().length >= 15) unmatched.push(section);
  }

  return { sections, byField, unmatched, sourceFormat };
}

export async function readTemplateFile(file: File): Promise<ParsedTemplateDocument> {
  const ext = assertAllowedTemplateFile(file);
  if (ext === ".docx") {
    const arrayBuffer = await file.arrayBuffer();
    assertDocxZipHeader(arrayBuffer);
    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml(
      { arrayBuffer },
      { styleMap: MAMMOTH_STYLE_MAP },
    );
    const sections = splitIntoSections(html);
    return assignSections(sections, "docx");
  }
  const text = await file.text();
  return assignSections(splitPlainTextSections(text), "txt");
}

export function parsePastedTemplateText(text: string): ParsedTemplateDocument {
  return assignSections(splitPlainTextSections(text), "txt");
}

function asListField(html: string): string[] {
  const cleaned = cleanHtml(html);
  return cleaned ? setListFieldHtml(cleaned) : [];
}

/** Fill service form fields from parsed template (merges into existing values). */
export function applyTemplateToServiceForm(
  parsed: ParsedTemplateDocument,
  current: ServiceFormValue,
): ServiceFormValue {
  const next: ServiceFormValue = { ...current };

  for (const [field, section] of Object.entries(parsed.byField) as [ServiceFieldKey, TemplateSection][]) {
    if (!section?.html?.trim()) continue;
    const html = cleanHtml(section.html);

    switch (field) {
      case "executive_summary_template":
        next.executive_summary_template = html;
        break;
      case "approach_methodology":
        next.approach_methodology = [{ name: "", description: html }];
        break;
      case "project_objectives":
      case "expected_benefits":
      case "deliverables":
      case "prerequisites":
      case "timeline_phases":
        next[field] = asListField(html);
        break;
    }
  }

  if (parsed.unmatched.length) {
    next.extra_sections = [
      ...current.extra_sections,
      ...parsed.unmatched.map((s) => ({ title: s.title, content: s.html })),
    ];
  }

  return next;
}
