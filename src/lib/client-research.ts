import { z } from "zod";

export const ClientResearchSchema = z.object({
  company_name: z.string(),
  website: z.string(),
  logo_url: z.string().nullable(),
  logo_data_url: z.string().nullable().optional(),
  industry: z.string(),
  hq: z.string(),
  size: z.string(),
  founded: z.string(),
  about: z.string(),
  key_offerings: z.array(z.string()),
  sources: z.array(z.string()),
  research_status: z.enum(["success", "partial", "manual"]),
  research_notes: z.string(),
});

export type ClientResearch = z.infer<typeof ClientResearchSchema>;

export function emptyClientResearch(clientName: string, website = ""): ClientResearch {
  return {
    company_name: clientName,
    website,
    logo_url: null,
    logo_data_url: null,
    industry: "",
    hq: "",
    size: "",
    founded: "",
    about: "",
    key_offerings: [],
    sources: [],
    research_status: "manual",
    research_notes: "",
  };
}

/** Plain-text block fed into executive-summary drafting. */
export function buildClientResearchContext(research: ClientResearch | null | undefined): string {
  if (!research) return "";
  const about = research.about || "";
  const parts = [
    about && `About the company: ${about}`,
    research.industry && `Industry: ${research.industry}`,
    research.hq && `Headquarters: ${research.hq}`,
    research.size && `Company size: ${research.size}`,
    research.founded && `Founded: ${research.founded}`,
    research.key_offerings.length > 0 && `Key offerings: ${research.key_offerings.filter(Boolean).join("; ")}`,
    research.website && `Website: ${research.website}`,
  ].filter(Boolean);
  return parts.join("\n");
}

/** Brief company summary only — used when drafting the executive summary. */
export function buildExecutiveSummaryCompanySummary(
  research: ClientResearch | null | undefined,
): string {
  if (!research) return "";
  return (research.about || "").trim();
}

/** Normalize legacy proposals that stored `summary` instead of `about`. */
export function normalizeClientResearch(raw: unknown, clientName: string, website = ""): ClientResearch {
  if (!raw || typeof raw !== "object") return emptyClientResearch(clientName, website);
  const r = raw as Record<string, unknown>;
  const base = emptyClientResearch(
    String(r.company_name || clientName),
    String(r.website || website),
  );
  return ClientResearchSchema.parse({
    ...base,
    ...r,
    company_name: String(r.company_name || clientName),
    website: String(r.website || website),
    about: String(r.about || r.summary || ""),
    key_offerings: Array.isArray(r.key_offerings) ? r.key_offerings.map(String) : [],
    sources: Array.isArray(r.sources) ? r.sources.map(String) : [],
    research_status: r.research_status === "success" || r.research_status === "partial" ? r.research_status : "manual",
    research_notes: String(r.research_notes || ""),
    logo_url: r.logo_url ? String(r.logo_url) : null,
    logo_data_url: r.logo_data_url ? String(r.logo_data_url) : null,
  });
}
