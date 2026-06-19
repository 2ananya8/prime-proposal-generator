import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ClientResearchSchema } from "./client-research";
import { applyTemplateToServiceForm, parsePastedTemplateText } from "./template-document-parser";
import {
  runClientResearch,
  runDraftExecutiveSummary,
  type DraftExecutiveSummaryInput,
} from "./research-client";

export type { ClientResearch } from "./client-research";

const ResearchInput = z.object({
  clientName: z.string().min(1),
  clientWebsite: z.string().optional().nullable(),
});

export const researchClient = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResearchInput.parse(input))
  .handler(async ({ data }) => runClientResearch(data));

export type ExtractedService = {
  name: string;
  service_type: string;
  short_code: string;
  executive_summary_template: string;
  project_objectives: string[];
  expected_benefits: string[];
  approach_methodology: { name: string; description: string }[];
  deliverables: string[];
  prerequisites: string[];
  timeline_phases: string[];
  extra_sections: { title: string; content: string }[];
};

const EMPTY_EXTRACTED_SERVICE: ExtractedService = {
  name: "",
  service_type: "",
  short_code: "",
  approach_methodology: [{ name: "", description: "" }],
  executive_summary_template: "",
  project_objectives: [],
  expected_benefits: [],
  deliverables: [],
  prerequisites: [],
  timeline_phases: [],
  extra_sections: [],
};

export function extractServiceFromDocument(documentText: string): ExtractedService {
  const parsed = parsePastedTemplateText(documentText);
  return applyTemplateToServiceForm(parsed, EMPTY_EXTRACTED_SERVICE);
}

const ExecSummaryInput = z.object({
  clientName: z.string(),
  clientSummary: z.string().optional(),
  clientResearch: ClientResearchSchema.partial().optional(),
  scope: z.string(),
  service: z.object({
    name: z.string(),
    service_type: z.string(),
    short_code: z.string().optional(),
    executive_summary_template: z.string().optional(),
    project_objectives: z.array(z.string()).optional(),
    expected_benefits: z.union([
      z.array(z.string()),
      z.array(z.object({ title: z.string().optional(), description: z.string().optional() })),
    ]).optional(),
    deliverables: z.array(z.string()).optional(),
    approach_methodology: z.array(z.object({
      name: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
    prerequisites_prime: z.array(z.string()).optional(),
    prerequisites_client: z.array(z.string()).optional(),
  }),
});

export const draftExecutiveSummary = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExecSummaryInput.parse(input))
  .handler(async ({ data }) => runDraftExecutiveSummary(data as DraftExecutiveSummaryInput));
