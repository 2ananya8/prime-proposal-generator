import type { ClientResearch } from "./client-research";

const BLOCKED_URL = /linkedin\.com|facebook\.com|instagram\.com|twitter\.com|t\.co|youtube\.com|tiktok\.com/i;

const COMPANY_JSON_SCHEMA = {
  type: "object",
  properties: {
    industry: { type: "string", description: "Primary industry sector" },
    hq: { type: "string", description: "Headquarters city and country" },
    size: { type: "string", description: "Employee count or company size" },
    founded: { type: "string", description: "Year founded" },
    about: { type: "string", description: "3-5 sentence professional company overview" },
    key_offerings: {
      type: "array",
      items: { type: "string" },
      description: "Main products or services",
    },
    website: { type: "string", description: "Official company website URL" },
  },
} as const;

export type ScrapedPage = {
  url: string;
  markdown: string;
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
  images?: string[];
};

function normalizeWebsite(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, "");
}

function isScrapableUrl(url: string): boolean {
  try {
    if (BLOCKED_URL.test(url)) return false;
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function absUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

export function pickLogoUrl(
  metadata: Record<string, unknown> | undefined,
  pageUrl: string,
  images?: string[],
): string | null {
  const candidates = [metadata?.ogImage, metadata?.og_image, images?.[0], metadata?.favicon]
    .map((v) => (typeof v === "string" ? v : null))
    .filter(Boolean) as string[];

  for (const c of candidates) {
    const href = c.startsWith("http") ? c : absUrl(pageUrl, c);
    if (/\.(png|jpe?g|svg|webp|gif)(\?|$)/i.test(href) || href.includes("logo") || metadata?.ogImage === c) {
      return href;
    }
  }
  return candidates[0] ? (candidates[0].startsWith("http") ? candidates[0] : absUrl(pageUrl, candidates[0])) : null;
}

export async function fetchLogoDataUrl(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, {
      headers: { "User-Agent": "PrimeInfoserv-ProposalBot/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 600_000) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function scoreSearchResult(url: string, clientName: string): number {
  const lower = url.toLowerCase();
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  let score = 0;
  if (BLOCKED_URL.test(url)) return -10;
  if (slug && lower.includes(slug.slice(0, Math.min(slug.length, 8)))) score += 4;
  if (/\.(com|io|co|in|org|net|ai)\b/.test(lower)) score += 2;
  if (/wikipedia\.org/.test(lower)) score += 1;
  if (/crunchbase\.com/.test(lower)) score += 1;
  return score;
}

function searchResultUrl(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const r = entry as Record<string, unknown>;
  const direct = r.url ?? r.link;
  if (typeof direct === "string") return direct;
  const meta = r.metadata;
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    const fromMeta = m.url ?? m.ogUrl ?? m.sourceURL;
    if (typeof fromMeta === "string") return fromMeta;
  }
  return null;
}

function heuristicAbout(markdown: string, metadata?: Record<string, unknown>): string {
  const desc = metadata?.description ?? metadata?.ogDescription;
  if (typeof desc === "string" && desc.trim().length > 40) return desc.trim();

  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#+\s*/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim())
    .filter((p) => p.length > 60 && !/^(\*|-|\d+\.)\s/.test(p));

  return paragraphs.slice(0, 2).join("\n\n").slice(0, 1200);
}

function mergeExtracted(
  target: Partial<ClientResearch>,
  json: Record<string, unknown> | undefined,
  markdown: string,
  metadata?: Record<string, unknown>,
) {
  if (!json) return;
  const str = (k: string) => (typeof json[k] === "string" ? json[k] as string : "");
  if (!target.industry && str("industry")) target.industry = str("industry");
  if (!target.hq && str("hq")) target.hq = str("hq");
  if (!target.size && str("size")) target.size = str("size");
  if (!target.founded && str("founded")) target.founded = str("founded");
  if (!target.about && str("about")) target.about = str("about");
  if (!target.website && str("website")) target.website = normalizeWebsite(str("website"));
  if ((!target.key_offerings || !target.key_offerings.length) && Array.isArray(json.key_offerings)) {
    target.key_offerings = json.key_offerings.map(String).filter(Boolean);
  }
  if (!target.about) target.about = heuristicAbout(markdown, metadata);
}

async function scrapePage(
  fc: InstanceType<typeof import("@mendable/firecrawl-js").default>,
  url: string,
  clientName: string,
): Promise<ScrapedPage | null> {
  if (!isScrapableUrl(url)) return null;
  try {
    const doc = await fc.scrape(url, {
      formats: [
        "markdown",
        {
          type: "json",
          prompt: `Extract factual company information about "${clientName}" from this page. Use only information explicitly stated. Leave unknown fields as empty strings or empty arrays.`,
          schema: COMPANY_JSON_SCHEMA,
        },
      ],
      onlyMainContent: true,
      timeout: 55_000,
    });
    return {
      url,
      markdown: doc.markdown ?? "",
      metadata: doc.metadata as Record<string, unknown> | undefined,
      json: (doc.json as Record<string, unknown> | undefined) ?? undefined,
      images: doc.images,
    };
  } catch (e) {
    console.warn("[firecrawl] scrape failed:", url, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function gatherCompanyResearch(
  clientName: string,
  websiteHint: string | null | undefined,
): Promise<{
  pages: ScrapedPage[];
  primaryWebsite: string;
  logoUrl: string | null;
  extracted: Partial<ClientResearch>;
  notes: string[];
}> {
  const notes: string[] = [];
  const pages: ScrapedPage[] = [];
  const extracted: Partial<ClientResearch> = {};
  let primaryWebsite = normalizeWebsite(websiteHint);
  let logoUrl: string | null = null;

  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    notes.push("FIRECRAWL_API_KEY is not set — add it to .env and restart the dev server.");
    return { pages, primaryWebsite, logoUrl, extracted, notes };
  }

  const Firecrawl = (await import("@mendable/firecrawl-js")).default;
  const fc = new Firecrawl({ apiKey });

  const candidateUrls = new Set<string>();
  if (primaryWebsite) candidateUrls.add(primaryWebsite);

  try {
    const search = await fc.search(
      websiteHint
        ? `${clientName} ${websiteHint} company about`
        : `${clientName} official company website about`,
      {
        limit: 8,
        sources: ["web"],
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: 45_000,
        },
      },
    );

    for (const entry of search.web ?? []) {
      const url = searchResultUrl(entry);
      if (!url || !isScrapableUrl(url)) continue;
      candidateUrls.add(normalizeWebsite(url));

      if (entry && typeof entry === "object" && "markdown" in entry) {
        const doc = entry as Record<string, unknown>;
        const md = typeof doc.markdown === "string" ? doc.markdown : "";
        if (md.trim()) {
          pages.push({
            url,
            markdown: md,
            metadata: doc.metadata as Record<string, unknown> | undefined,
            images: Array.isArray(doc.images) ? doc.images.map(String) : undefined,
          });
        }
      }
    }
  } catch (e) {
    console.warn("[firecrawl] search failed", e);
    notes.push("Web search failed — try entering the company website on step 1.");
  }

  if (!primaryWebsite && pages.length) {
    const ranked = [...candidateUrls].sort(
      (a, b) => scoreSearchResult(b, clientName) - scoreSearchResult(a, clientName),
    );
    primaryWebsite = ranked[0] ?? "";
  } else if (!primaryWebsite && candidateUrls.size) {
    primaryWebsite = [...candidateUrls].sort(
      (a, b) => scoreSearchResult(b, clientName) - scoreSearchResult(a, clientName),
    )[0];
  }

  const urlsToScrape = [...candidateUrls]
    .filter(isScrapableUrl)
    .sort((a, b) => scoreSearchResult(b, clientName) - scoreSearchResult(a, clientName))
    .filter((url, i, arr) => arr.indexOf(url) === i)
    .slice(0, 3);

  for (const url of urlsToScrape) {
    if (pages.some((p) => p.url === url)) continue;
    const page = await scrapePage(fc, url, clientName);
    if (page) pages.push(page);
  }

  if (!pages.length) {
    notes.push("No company pages could be scraped. Enter the website on step 1 or fill fields manually.");
    return { pages, primaryWebsite, logoUrl, extracted, notes };
  }

  for (const page of pages) {
    mergeExtracted(extracted, page.json, page.markdown, page.metadata);
    if (!logoUrl) logoUrl = pickLogoUrl(page.metadata, page.url, page.images);
  }

  if (extracted.about) {
    notes.push(`Research gathered from ${pages.length} source(s). Review and edit before continuing.`);
  } else {
    notes.push("Limited data found — please complete the fields manually.");
  }

  return {
    pages,
    primaryWebsite: extracted.website || primaryWebsite,
    logoUrl,
    extracted,
    notes,
  };
}
