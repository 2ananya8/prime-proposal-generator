import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ClientResearchSchema,
  emptyClientResearch,
  type ClientResearch,
} from "./client-research";
import { applyTemplateToServiceForm, parsePastedTemplateText } from "./template-document-parser";
import {
  fetchLogoDataUrl,
  gatherCompanyResearch,
} from "./firecrawl-research.server";
import {
  buildExecutiveSummaryPrompt,
  EXECUTIVE_SUMMARY_SYSTEM_PROMPT,
  fallbackExecutiveSummary,
  isExecutiveSummaryAiRecoverableError,
  normalizeAiExecutiveSummary,
} from "./executive-summary-draft";

export type { ClientResearch } from "./client-research";

const ResearchInput = z.object({
  clientName: z.string().min(1),
  clientWebsite: z.string().optional().nullable(),
});

function normalizeWebsite(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, "");
}

function researchStatus(fields: Partial<ClientResearch>, scraped: boolean): ClientResearch["research_status"] {
  const filled = [
    fields.about,
    fields.industry,
    fields.hq,
    fields.size,
    fields.founded,
    fields.key_offerings?.length,
  ].filter(Boolean).length;
  if (fields.about && filled >= 2) return "success";
  if (scraped && filled >= 1) return "partial";
  return "manual";
}

async function enrichWithAnthropic(
  clientName: string,
  context: string,
  existing: Partial<ClientResearch>,
): Promise<{ fields: Partial<ClientResearch>; note?: string }> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return { fields: {} };
  if (existing.about && existing.industry) return { fields: {} };

  try {
    const { createAnthropicClient } = await import("./ai-gateway.server");
    const anthropic = createAnthropicClient();

    const prompt = `You are researching "${clientName}" for a B2B cybersecurity proposal.

Use ONLY the web context below. If a field is not supported by the context, use an empty string — do NOT guess.

--- WEB CONTEXT ---
${context || "(no web pages were scraped)"}
--- END CONTEXT ---

Return ONLY valid JSON (no markdown fences):
{
  "industry": "primary industry sector",
  "hq": "headquarters city and country",
  "size": "employee count or size band if known, else empty",
  "founded": "year founded if known, else empty",
  "about": "3-5 sentence professional company overview",
  "key_offerings": ["main products or services"],
  "website": "official website URL if identifiable, else empty"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content.find((b) => b.type === "text")?.text ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    return {
      fields: {
        industry: String(parsed.industry ?? ""),
        hq: String(parsed.hq ?? ""),
        size: String(parsed.size ?? ""),
        founded: String(parsed.founded ?? ""),
        about: String(parsed.about ?? parsed.summary ?? ""),
        key_offerings: Array.isArray(parsed.key_offerings) ? parsed.key_offerings.map(String) : [],
        website: normalizeWebsite(String(parsed.website ?? "")),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[research] AI enrichment skipped:", msg);
    if (/credit balance|billing|quota|rate limit/i.test(msg)) {
      return { fields: {}, note: "AI enrichment skipped (Anthropic credits unavailable) — using website data." };
    }
    return { fields: {}, note: "AI enrichment failed — using website data where available." };
  }
}

function mergeFields(base: Partial<ClientResearch>, overlay: Partial<ClientResearch>): Partial<ClientResearch> {
  return {
    industry: base.industry || overlay.industry || "",
    hq: base.hq || overlay.hq || "",
    size: base.size || overlay.size || "",
    founded: base.founded || overlay.founded || "",
    about: base.about || overlay.about || "",
    key_offerings: base.key_offerings?.length ? base.key_offerings : overlay.key_offerings ?? [],
    website: base.website || overlay.website || "",
  };
}

export const researchClient = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResearchInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const base = emptyClientResearch(data.clientName, normalizeWebsite(data.clientWebsite));
      const { pages, primaryWebsite, logoUrl, extracted, notes } = await gatherCompanyResearch(
        data.clientName,
        data.clientWebsite,
      );

      const sourceUrls = pages.map((p) => p.url);
      const context = pages.map((p) => `### Source: ${p.url}\n${p.markdown.slice(0, 5000)}`).join("\n\n");

      const { fields: aiFields, note: aiNote } = await enrichWithAnthropic(data.clientName, context, extracted);
      if (aiNote) notes.push(aiNote);

      const merged = mergeFields(extracted, aiFields);
      const website = merged.website || primaryWebsite || base.website;
      const logo_data_url = await fetchLogoDataUrl(logoUrl);
      const status = researchStatus(merged, sourceUrls.length > 0);

      return ClientResearchSchema.parse({
        ...base,
        ...merged,
        company_name: data.clientName,
        website,
        logo_url: logoUrl,
        logo_data_url,
        sources: sourceUrls,
        research_status: status,
        research_notes: notes.join(" "),
      });
    } catch (e) {
      console.error("[research] researchClient failed", e);
      const msg = e instanceof Error ? e.message : "Research failed";
      return ClientResearchSchema.parse({
        ...emptyClientResearch(data.clientName, normalizeWebsite(data.clientWebsite)),
        research_status: "manual",
        research_notes: `${msg} — fill in the fields manually.`,
      });
    }
  });

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
  .handler(async ({ data }) => {
    const draftInput = {
      clientName: data.clientName,
      clientResearch: data.clientResearch,
      clientSummary: data.clientSummary,
      scope: data.scope,
      service: data.service,
    };

    const prompt = buildExecutiveSummaryPrompt(draftInput);

    try {
      const { createAnthropicClient } = await import("./ai-gateway.server");
      const anthropic = createAnthropicClient();

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2200,
        system: EXECUTIVE_SUMMARY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = message.content.find((b) => b.type === "text")?.text ?? "";
      const summary = normalizeAiExecutiveSummary(raw);
      if (!summary) throw new Error("AI returned an empty executive summary.");

      return { executive_summary: summary };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[research] draftExecutiveSummary failed:", msg);

      if (isExecutiveSummaryAiRecoverableError(msg)) {
        return {
          executive_summary: fallbackExecutiveSummary(draftInput),
          fallback: true,
          message: "AI drafting is temporarily unavailable — a basic draft was generated. Edit it or try AI draft again.",
        };
      }

      if (/Missing ANTHROPIC_API_KEY/i.test(msg)) {
        throw new Error("AI drafting requires ANTHROPIC_API_KEY in your .env file.");
      }

      throw new Error(msg || "AI executive summary drafting failed.");
    }
  });
