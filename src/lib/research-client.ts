import {
  ClientResearchSchema,
  emptyClientResearch,
  type ClientResearch,
} from "./client-research";
import { getAnthropicApiKey } from "./app-config";
import { createAnthropicClient } from "./ai-gateway";
import { fetchLogoDataUrl, gatherCompanyResearch } from "./firecrawl-research";
import {
  buildExecutiveSummaryPrompt,
  EXECUTIVE_SUMMARY_SYSTEM_PROMPT,
  fallbackExecutiveSummary,
  isExecutiveSummaryAiRecoverableError,
  normalizeAiExecutiveSummary,
} from "./executive-summary-draft";

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
  if (!getAnthropicApiKey()) return { fields: {} };
  if (existing.about && existing.industry) return { fields: {} };

  try {
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

export type ClientResearchInput = {
  clientName: string;
  clientWebsite?: string | null;
};

export async function runClientResearch(data: ClientResearchInput): Promise<ClientResearch> {
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
    console.error("[research] runClientResearch failed", e);
    const msg = e instanceof Error ? e.message : "Research failed";
    return ClientResearchSchema.parse({
      ...emptyClientResearch(data.clientName, normalizeWebsite(data.clientWebsite)),
      research_status: "manual",
      research_notes: `${msg} — fill in the fields manually.`,
    });
  }
}

export type DraftExecutiveSummaryInput = {
  clientName: string;
  clientSummary?: string;
  clientResearch?: Partial<ClientResearch>;
  scope: string;
  service: {
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
};

export type DraftExecutiveSummaryResult = {
  executive_summary: string;
  fallback?: boolean;
  message?: string;
};

export async function runDraftExecutiveSummary(
  data: DraftExecutiveSummaryInput,
): Promise<DraftExecutiveSummaryResult> {
  const draftInput = {
    clientName: data.clientName,
    clientResearch: data.clientResearch,
    clientSummary: data.clientSummary,
    scope: data.scope,
    service: data.service,
  };

  const prompt = buildExecutiveSummaryPrompt(draftInput);

  try {
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
    console.warn("[research] runDraftExecutiveSummary failed:", msg);

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
}
