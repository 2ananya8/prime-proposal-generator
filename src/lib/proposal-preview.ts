import { parseScopeFromDetails, type ScopeField } from "./scope-fields";
import { normalizeCommercials } from "./commercials-line-item";

export type ProposalContentOverrides = {
  project_objectives?: string[];
  expected_benefits?: string[];
  deliverables?: string[];
  approach_methodology?: { name: string; description: string }[];
  prerequisites?: string[];
};

const CLIENT_NAME_TOKEN_RE = /\{\{\s*client_name\s*\}\}/gi;

function fillClientName(text: string | undefined | null, clientName: string): string {
  const raw = String(text ?? "");
  return raw.replace(CLIENT_NAME_TOKEN_RE, clientName);
}

export function mergeServiceContent(service: Record<string, unknown>, overrides?: ProposalContentOverrides | null) {
  if (!service) return service;
  if (!overrides) return service;
  const merged = { ...service };
  for (const key of Object.keys(overrides) as (keyof ProposalContentOverrides)[]) {
    const value = overrides[key];
    if (value === undefined) continue;
    if (key === "prerequisites") {
      merged.prerequisites_prime = value;
      merged.prerequisites_client = [];
      continue;
    }
    merged[key] = value as never;
  }
  return merged;
}

export type ProposalPreviewData = {
  clientName: string;
  clientLogo?: string | null;
  proposalDate: string;
  service: {
    name: string;
    service_type: string;
    short_code?: string | null;
    approach_methodology?: { name?: string; description?: string }[];
    project_objectives?: string[];
    expected_benefits?: string[] | { title?: string; description?: string }[];
    deliverables?: string[];
    coverage_matrix?: { title?: string; headers?: string[]; rows?: string[][] } | null;
    prerequisites_prime?: string[];
    prerequisites_client?: string[];
    timeline_phases?: string[] | { phase?: string; activity?: string; duration?: string }[];
    extra_sections?: { title?: string; content?: string }[];
  };
  executiveSummary: string;
  clientResearch?: {
    industry?: string;
    hq?: string;
    size?: string;
    summary?: string;
    key_offerings?: string[];
  } | null;
  scope: { fields: ScopeField[]; project_overview?: string };
  timeline: { phase?: string; activity?: string; duration?: string }[];
  commercials: {
    line_items: { description: string; qty: number; rate: number; amount: number }[];
    gst_percent: number;
    subtotal: number;
    gst_amount: number;
    total: number;
    notes?: string;
  };
  milestones: { label: string; percent: number; trigger?: string }[];
  extras: { title: string; content: string }[];
};

export function buildProposalPreview(proposal: any): ProposalPreviewData | null {
  const service = proposal.service;
  if (!service) return null;
  const commercials = normalizeCommercials(proposal.commercials as any);
  const timeline = ((proposal.timeline_overrides as any)?.length
    ? proposal.timeline_overrides
    : service.timeline_phases) ?? [];
  const scopeRaw = (proposal.scope_details as Record<string, unknown>) || {};
  const contentOverrides = scopeRaw.content_overrides as ProposalContentOverrides | undefined;
  const scope = parseScopeFromDetails(scopeRaw);
  const extras = ((proposal.extra_fields as any) || []).filter((x: any) => x?.title || x?.content);
  const mergedService = mergeServiceContent(service, contentOverrides);
  const clientName = String(proposal.client_name ?? "");
  const filledScopeFields = scope.fields.map((f) => ({
    title: fillClientName(f.title, clientName),
    content: fillClientName(f.content, clientName),
  }));
  const filledProjectOverview = fillClientName(scope.project_overview, clientName);
  const filledCommercials = {
    ...commercials,
    line_items: commercials.line_items.map((li) => ({
      ...li,
      description: fillClientName(li.description, clientName),
    })),
    notes: fillClientName(commercials.notes, clientName),
  };
  const filledTimeline = (timeline as any[]).map((t) => ({
    phase: fillClientName(t.phase, clientName),
    activity: fillClientName(t.activity, clientName),
    duration: fillClientName(t.duration, clientName),
  }));
  const filledExtras = extras.map((x: any) => ({
    title: fillClientName(x.title, clientName),
    content: fillClientName(x.content, clientName),
  }));
  const rawBenefits = mergedService.expected_benefits as ProposalPreviewData["service"]["expected_benefits"];
  const filledBenefits = Array.isArray(rawBenefits)
    ? (typeof rawBenefits[0] === "string"
      ? (rawBenefits as string[]).map((x) => fillClientName(x, clientName))
      : (rawBenefits as { title?: string; description?: string }[]).map((x) => ({
          title: fillClientName(x.title, clientName),
          description: fillClientName(x.description, clientName),
        })))
    : [];

  return {
    clientName,
    clientLogo: proposal.client_logo ?? null,
    proposalDate: proposal.proposal_date,
    service: {
      name: mergedService.name as string,
      service_type: mergedService.service_type as string,
      short_code: mergedService.short_code as string | null,
      approach_methodology: ((mergedService.approach_methodology as ProposalPreviewData["service"]["approach_methodology"]) || []).map((x) => ({
        name: fillClientName(x?.name, clientName),
        description: fillClientName(x?.description, clientName),
      })),
      project_objectives: ((mergedService.project_objectives as string[]) || []).map((x) => fillClientName(x, clientName)),
      expected_benefits: filledBenefits,
      deliverables: ((mergedService.deliverables as string[]) || []).map((x) => fillClientName(x, clientName)),
      coverage_matrix: mergedService.coverage_matrix as ProposalPreviewData["service"]["coverage_matrix"],
      prerequisites_prime: ((mergedService.prerequisites_prime as string[]) || []).map((x) => fillClientName(x, clientName)),
      prerequisites_client: ((mergedService.prerequisites_client as string[]) || []).map((x) => fillClientName(x, clientName)),
      timeline_phases: (mergedService.timeline_phases as ProposalPreviewData["service"]["timeline_phases"]) || [],
      extra_sections: ((mergedService.extra_sections as ProposalPreviewData["service"]["extra_sections"]) || []).map((x) => ({
        title: fillClientName(x?.title, clientName),
        content: fillClientName(x?.content, clientName),
      })),
    },
    executiveSummary: fillClientName(proposal.executive_summary || "", clientName),
    clientResearch: proposal.client_research,
    scope: { fields: filledScopeFields, project_overview: filledProjectOverview },
    timeline: filledTimeline,
    commercials: filledCommercials,
    milestones: ((proposal.payment_milestones as any) || []).map((m: any) => ({
      ...m,
      label: fillClientName(m?.label, clientName),
      trigger: fillClientName(m?.trigger, clientName),
    })),
    extras: filledExtras,
  };
}

export function buildWizardPreviewData(input: {
  clientName: string;
  clientLogo?: string | null;
  proposalDate: string;
  service: Record<string, unknown> | null | undefined;
  contentOverrides?: ProposalContentOverrides;
  executiveSummary: string;
  clientResearch?: unknown;
  scope: { fields: ScopeField[]; project_overview?: string };
  timeline: { phase?: string; activity?: string; duration?: string }[];
  commercials: ProposalPreviewData["commercials"];
  milestones: ProposalPreviewData["milestones"];
  extras: ProposalPreviewData["extras"];
}): ProposalPreviewData | null {
  if (!input.service) return null;
  const clientName = input.clientName;
  const mergedService = mergeServiceContent(input.service, input.contentOverrides);
  const normalizedCommercials = normalizeCommercials(input.commercials);
  const rawBenefits = mergedService.expected_benefits as ProposalPreviewData["service"]["expected_benefits"];
  const filledBenefits = Array.isArray(rawBenefits)
    ? (typeof rawBenefits[0] === "string"
      ? (rawBenefits as string[]).map((x) => fillClientName(x, clientName))
      : (rawBenefits as { title?: string; description?: string }[]).map((x) => ({
          title: fillClientName(x.title, clientName),
          description: fillClientName(x.description, clientName),
        })))
    : [];
  return {
    clientName,
    clientLogo: input.clientLogo ?? null,
    proposalDate: input.proposalDate,
    service: {
      name: String(mergedService.name ?? ""),
      service_type: String(mergedService.service_type ?? ""),
      short_code: (mergedService.short_code as string) ?? null,
      approach_methodology: ((mergedService.approach_methodology as ProposalPreviewData["service"]["approach_methodology"]) || []).map((x) => ({
        name: fillClientName(x?.name, clientName),
        description: fillClientName(x?.description, clientName),
      })),
      project_objectives: ((mergedService.project_objectives as string[]) || []).map((x) => fillClientName(x, clientName)),
      expected_benefits: filledBenefits,
      deliverables: ((mergedService.deliverables as string[]) || []).map((x) => fillClientName(x, clientName)),
      coverage_matrix: mergedService.coverage_matrix as ProposalPreviewData["service"]["coverage_matrix"],
      prerequisites_prime: ((mergedService.prerequisites_prime as string[]) || []).map((x) => fillClientName(x, clientName)),
      prerequisites_client: ((mergedService.prerequisites_client as string[]) || []).map((x) => fillClientName(x, clientName)),
      timeline_phases: (mergedService.timeline_phases as ProposalPreviewData["service"]["timeline_phases"]) || [],
      extra_sections: ((mergedService.extra_sections as ProposalPreviewData["service"]["extra_sections"]) || []).map((x) => ({
        title: fillClientName(x?.title, clientName),
        content: fillClientName(x?.content, clientName),
      })),
    },
    executiveSummary: fillClientName(input.executiveSummary, clientName),
    clientResearch: input.clientResearch as ProposalPreviewData["clientResearch"],
    scope: {
      fields: input.scope.fields.map((f) => ({
        title: fillClientName(f.title, clientName),
        content: fillClientName(f.content, clientName),
      })),
      project_overview: fillClientName(input.scope.project_overview, clientName),
    },
    timeline: input.timeline.map((t) => ({
      phase: fillClientName(t.phase, clientName),
      activity: fillClientName(t.activity, clientName),
      duration: fillClientName(t.duration, clientName),
    })),
    commercials: {
      ...normalizedCommercials,
      line_items: normalizedCommercials.line_items.map((li) => ({
        ...li,
        description: fillClientName(li.description, clientName),
      })),
      notes: fillClientName(input.commercials.notes, clientName),
    },
    milestones: input.milestones.map((m) => ({
      ...m,
      label: fillClientName(m.label, clientName),
      trigger: fillClientName(m.trigger, clientName),
    })),
    extras: input.extras.map((x) => ({
      title: fillClientName(x.title, clientName),
      content: fillClientName(x.content, clientName),
    })),
  };
}
