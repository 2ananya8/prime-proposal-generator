import { buildExecutiveSummaryCompanySummary, type ClientResearch } from "./client-research";
import { expandListField, plainTextField } from "./html-content";
import {
  formatCurrentServiceRequested,
  getExecutiveSummarySampleForService,
} from "./executive-summary-samples";
import {
  approachToHtml,
  normalizeBenefitsForExport,
  prerequisitesToHtml,
} from "./service-field-helpers";

export type ExecutiveSummaryServiceInput = {
  name: string;
  service_type: string;
  short_code?: string;
  executive_summary_template?: string;
  project_objectives?: string[];
  expected_benefits?: string[] | { title?: string; description?: string }[];
  deliverables?: string[];
  approach_methodology?: { name?: string; description?: string }[];
  prerequisites_prime?: string[];
  prerequisites_client?: string[];
};

export type ExecutiveSummaryDraftInput = {
  clientName: string;
  clientResearch?: Partial<ClientResearch> | null;
  clientSummary?: string;
  scope: string;
  service: ExecutiveSummaryServiceInput;
};

export const EXECUTIVE_SUMMARY_SYSTEM_PROMPT =
  "You are a senior proposal writer for Prime Infoserv Pvt. Ltd. "
  + "You write original executive summaries for client proposals using past samples as guidelines for structure and tone.";

function listSection(label: string, items: string[]): string {
  const lines = items.map((s) => plainTextField(s)).filter(Boolean);
  if (!lines.length) return "";
  return `${label}:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

export function buildServiceEngagementContext(service: ExecutiveSummaryServiceInput): string {
  const objectives = expandListField(service.project_objectives);
  const benefits = normalizeBenefitsForExport(service.expected_benefits);
  const deliverables = expandListField(service.deliverables);
  const approach = plainTextField(approachToHtml(service.approach_methodology));
  const prerequisites = plainTextField(
    prerequisitesToHtml({
      prerequisites_prime: service.prerequisites_prime ?? [],
      prerequisites_client: service.prerequisites_client ?? [],
    }),
  );

  const parts = [
    `Service name: ${service.name}`,
    `Service type: ${service.service_type}`,
    service.short_code && `Short code: ${service.short_code}`,
    listSection("Project objectives", objectives),
    listSection("Expected benefits", benefits),
    listSection("Deliverables", deliverables),
    approach && `Approach & methodology:\n${approach}`,
    prerequisites && `Prerequisites:\n${prerequisites}`,
    service.executive_summary_template?.trim()
      && `Service executive-summary notes:\n${plainTextField(service.executive_summary_template)}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}

function buildResearchBlock(input: ExecutiveSummaryDraftInput): string {
  if (input.clientResearch) {
    return buildExecutiveSummaryCompanySummary({
      company_name: input.clientName,
      website: "",
      logo_url: null,
      industry: "",
      hq: "",
      size: "",
      founded: "",
      about: "",
      key_offerings: [],
      sources: [],
      research_status: "manual",
      research_notes: "",
      ...input.clientResearch,
    } as ClientResearch);
  }
  return input.clientSummary?.trim() || "";
}

export function serviceInputFromRecord(svc: Record<string, unknown>): ExecutiveSummaryServiceInput {
  return {
    name: String(svc.name ?? ""),
    service_type: String(svc.service_type ?? ""),
    short_code: svc.short_code ? String(svc.short_code) : undefined,
    executive_summary_template: svc.executive_summary_template
      ? String(svc.executive_summary_template) : undefined,
    project_objectives: Array.isArray(svc.project_objectives)
      ? svc.project_objectives.map(String) : undefined,
    expected_benefits: svc.expected_benefits as ExecutiveSummaryServiceInput["expected_benefits"],
    deliverables: Array.isArray(svc.deliverables) ? svc.deliverables.map(String) : undefined,
    approach_methodology: Array.isArray(svc.approach_methodology)
      ? svc.approach_methodology as ExecutiveSummaryServiceInput["approach_methodology"]
      : undefined,
    prerequisites_prime: Array.isArray(svc.prerequisites_prime)
      ? svc.prerequisites_prime.map(String) : undefined,
    prerequisites_client: Array.isArray(svc.prerequisites_client)
      ? svc.prerequisites_client.map(String) : undefined,
  };
}

export function buildExecutiveSummaryPrompt(input: ExecutiveSummaryDraftInput): string {
  const researchContext = buildResearchBlock(input);
  const serviceContext = buildServiceEngagementContext(input.service);
  const scopeLine = input.scope.trim() || "As defined in the Scope section of this proposal.";
  const currentService = formatCurrentServiceRequested(input.service);
  const sample = getExecutiveSummarySampleForService(input.service);

  const guidelineBlock = sample
    ? `This is a sample executive summary from an actual past proposal for a past client requesting ${sample.serviceRequested}:

${sample.sampleText}

Use it as the guidelines to create the Executive Summary for ${input.clientName} requesting ${currentService}.`
    : `Write the Executive Summary for ${input.clientName} requesting ${currentService}.

Use a professional multi-paragraph structure: opening business context, proposed engagement, approach and methodology, applicable standards, deliverables and outcomes, and client benefits.`;

  return `${guidelineBlock}

BRIEF COMPANY SUMMARY (optional — weave at most 1–2 sentences into the opening if helpful; do not list key offerings, founding year, HQ, size, or website):
${researchContext || "(No company summary available.)"}

SERVICE DEFINITION:
${serviceContext}

PROPOSAL SCOPE:
${scopeLine}

Write 5–6 paragraphs in third person, formal proposal language. Use "${input.clientName}" throughout. Ground the content in the service definition and scope above. Do not include bullet lists of company facts (offerings, founded date, headquarters, etc.). No heading, markdown, or bullet lists.

Return only the executive summary body text.`;
}

/** Strip optional markdown fences from model output. */
export function normalizeAiExecutiveSummary(text: string): string {
  return text
    .replace(/^```(?:markdown|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function fillLegacyTemplate(template: string, input: ExecutiveSummaryDraftInput): string {
  const researchContext = buildResearchBlock(input);
  return template
    .replaceAll("{{client_name}}", input.clientName)
    .replaceAll("{{client_summary}}", researchContext)
    .replaceAll("{{scope}}", input.scope.trim() || "the agreed scope");
}

/** Fill the service executive-summary template with proposal context, if one exists. */
export function buildExecutiveSummaryFromTemplate(input: ExecutiveSummaryDraftInput): string | null {
  const fromTemplate = input.service.executive_summary_template?.trim();
  if (!fromTemplate) return null;
  const filled = fillLegacyTemplate(fromTemplate, input).trim();
  return filled || null;
}

export type ExecutiveSummarySources = {
  /** Set when the user has edited the executive summary field; `null` means they have not. */
  userInput: string | null;
  template: string | null;
  aiInput: string;
  /** User clicked AI Draft — use AI even when a template exists. */
  preferAi?: boolean;
};

/** user input > template > AI (unless user explicitly requested AI draft). */
export function resolveExecutiveSummary(sources: ExecutiveSummarySources): string {
  const user = sources.userInput?.trim();
  if (user) return user;
  if (sources.preferAi && sources.aiInput.trim()) return sources.aiInput;
  if (sources.template?.trim()) return sources.template;
  return sources.aiInput;
}

/** Minimal non-AI fallback — never uses past proposal example text. */
export function fallbackExecutiveSummary(input: ExecutiveSummaryDraftInput): string {
  const serviceLabel = input.service.name || input.service.service_type;
  const scopeLine = input.scope.trim() || "the agreed scope";

  const fromTemplate = buildExecutiveSummaryFromTemplate(input);
  if (fromTemplate) return fromTemplate;

  const objectives = expandListField(input.service.project_objectives);
  const deliverables = expandListField(input.service.deliverables);

  return [
    `Prime Infoserv Pvt. Ltd. proposes to deliver ${serviceLabel} for ${input.clientName}, addressing ${scopeLine}.`,
    objectives.length
      ? `The engagement will focus on: ${objectives.slice(0, 4).join("; ")}.`
      : null,
    deliverables.length
      ? `Deliverables include: ${deliverables.slice(0, 4).join("; ")}.`
      : `Deliverables will align with the agreed scope and service definition.`,
    `This engagement will help ${input.clientName} strengthen its security and compliance posture.`,
  ].filter(Boolean).join("\n\n");
}

export function isExecutiveSummaryAiRecoverableError(message: string): boolean {
  return /credit balance|billing|quota|rate limit|overloaded/i.test(message);
}
