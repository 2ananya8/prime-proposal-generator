import type { ProposalPreviewData } from "./proposal-preview";
import { expandListField, plainTextField } from "./html-content";
import {
  listFieldHtml,
  normalizeApproachForExport,
  benefitsToHtml,
  normalizeExtraSectionsForForm,
  prerequisitesToHtml,
} from "./service-field-helpers";
import { overviewRowsToHtml } from "./project-overview";
import { getScopeEngagementText, isScopeEngagementField } from "./scope-fields";

/** True when rich-text or plain field has visible content. */
export function hasFilledText(text: string | undefined | null): boolean {
  return Boolean(plainTextField(text));
}

export function hasListItems(items: string[] | undefined | null): boolean {
  return expandListField(items ?? undefined).length > 0;
}

function isOverviewValueFilled(value: string | undefined): boolean {
  const v = (value ?? "").trim();
  return Boolean(v && v !== "—");
}

export function getFilledOverviewRows(data: ProposalPreviewData): string[][] {
  return data.scope.fields
    .filter((f) => f.title.trim() && isOverviewValueFilled(f.content))
    .filter((f) => !isScopeEngagementField(f.title))
    .map((f) => [f.title.trim(), f.content.trim()]);
}

/** Rich HTML for project overview — uses stored content or migrates legacy table rows. */
export function getProjectOverviewHtml(data: ProposalPreviewData): string {
  const stored = data.scope.project_overview;
  if (hasFilledText(stored)) return stored!.trim();
  return overviewRowsToHtml(getFilledOverviewRows(data));
}

function isTimelineRowFilled(row: string[]): boolean {
  const phase = row[0]?.trim() ?? "";
  if (phase.toLowerCase() === "total") return false;
  return Boolean(phase || row[1]?.trim() || row[2]?.trim());
}

/** Timeline rows with empty phases removed; returns [] when nothing to show. */
export function getFilledTimelineRows(rawRows: string[][]): string[][] {
  const body = rawRows.filter(isTimelineRowFilled);
  if (!body.length) return [];

  const totalDuration =
    rawRows.find((r) => r[0]?.toLowerCase() === "total")?.[2]?.trim()
    || body.at(-1)?.[2]?.trim()
    || "";

  if (totalDuration && !body.some((r) => r[0]?.toLowerCase() === "total")) {
    body.push(["Total", "", totalDuration]);
  }

  return body;
}

export function hasFilledMilestones(
  milestones: ProposalPreviewData["milestones"] | undefined | null,
): boolean {
  return (milestones ?? []).some(
    (m) => Boolean(m.label?.trim() || (m.percent ?? 0) > 0),
  );
}

export function getFilledMilestones(milestones: ProposalPreviewData["milestones"]): ProposalPreviewData["milestones"] {
  return milestones.filter(
    (m) => Boolean(m.label?.trim() || (m.percent ?? 0) > 0),
  );
}

export function hasCoverageMatrix(
  service: ProposalPreviewData["service"],
): service is ProposalPreviewData["service"] & {
  coverage_matrix: { headers: string[]; rows: string[][] };
} {
  return Boolean(
    service.coverage_matrix?.headers?.length
    && service.coverage_matrix?.rows?.length
    && service.coverage_matrix.rows.some((row) => row.some((cell) => String(cell ?? "").trim())),
  );
}

export type ProposalCustomSection = { title: string; content: string };

/** Service custom sections plus proposal-specific extras, in document order. */
export function getFilledCustomSections(data: ProposalPreviewData): ProposalCustomSection[] {
  const serviceSections = normalizeExtraSectionsForForm(data.service.extra_sections ?? []);
  const proposalSections = (data.extras ?? []).map((x) => ({
    title: (x.title ?? "").trim(),
    content: x.content ?? "",
  }));
  return [...serviceSections, ...proposalSections].filter(
    (s) => s.title.trim() || hasFilledText(s.content),
  );
}

export function customSectionTitle(title: string): string {
  return title.trim() || "Additional Information";
}

export type ProposalSectionContent = {
  executiveSummary: string;
  overviewHtml: string;
  projectObjectivesHtml: string;
  expectedBenefitsHtml: string;
  scopeText: string;
  deliverablesHtml: string;
  approachBody: string;
  prerequisitesHtml: string;
  timelineRows: string[][];
  milestones: ProposalPreviewData["milestones"];
  customSections: ProposalCustomSection[];
  commercialsNotes: string;
  hasCommercialLineItems: boolean;
};

function getRawTimelineRows(data: ProposalPreviewData): string[][] {
  return data.timeline.map((t) => [t.phase || "", t.activity || "", t.duration || ""]);
}

export function getProposalSectionContent(data: ProposalPreviewData): ProposalSectionContent {
  const { service, commercials, milestones } = data;
  const projectObjectivesHtml = listFieldHtml(service.project_objectives);

  const rawBenefits = service.expected_benefits as unknown;
  const expectedBenefitsHtml = Array.isArray(rawBenefits)
    ? (rawBenefits.length && typeof rawBenefits[0] === "string"
      ? listFieldHtml(rawBenefits as unknown as string[])
      : benefitsToHtml(rawBenefits as any))
    : "";

  return {
    executiveSummary: data.executiveSummary?.trim() ?? "",
    overviewHtml: getProjectOverviewHtml(data),
    projectObjectivesHtml,
    expectedBenefitsHtml,
    scopeText: plainTextField(getScopeEngagementText(data.scope.fields)),
    deliverablesHtml: listFieldHtml(service.deliverables),
    approachBody: normalizeApproachForExport(service.approach_methodology),
    prerequisitesHtml: prerequisitesToHtml(service),
    timelineRows: getFilledTimelineRows(getRawTimelineRows(data)),
    milestones: getFilledMilestones(milestones ?? []),
    customSections: getFilledCustomSections(data),
    commercialsNotes: plainTextField(commercials.notes),
    hasCommercialLineItems: commercials.line_items.some(
      (li) => li.description?.trim() || li.qty > 0 || li.rate > 0 || li.amount > 0,
    ),
  };
}
