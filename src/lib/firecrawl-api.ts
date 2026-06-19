const FIRECRAWL_API = "https://api.firecrawl.dev";

type FirecrawlResponse<T> = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
};

async function firecrawlPost<T>(
  apiKey: string,
  path: string,
  body: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await fetch(`${FIRECRAWL_API}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json()) as FirecrawlResponse<T>;
    if (!res.ok || !json.success) {
      throw new Error(json.error || json.message || `Firecrawl ${path} failed (${res.status})`);
    }
    return json.data as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type FirecrawlScrapeResult = {
  markdown?: string;
  metadata?: Record<string, unknown>;
  json?: Record<string, unknown>;
  images?: string[];
};

export async function firecrawlScrape(
  apiKey: string,
  url: string,
  options: {
    formats: unknown[];
    onlyMainContent?: boolean;
    timeout?: number;
  },
): Promise<FirecrawlScrapeResult> {
  return firecrawlPost<FirecrawlScrapeResult>(
    apiKey,
    "/v2/scrape",
    { url, ...options },
    options.timeout ? options.timeout + 5_000 : undefined,
  );
}

export type FirecrawlSearchResult = {
  web?: Array<Record<string, unknown>>;
  news?: Array<Record<string, unknown>>;
  images?: Array<Record<string, unknown>>;
};

export async function firecrawlSearch(
  apiKey: string,
  query: string,
  options: {
    limit?: number;
    sources?: string[];
    timeout?: number;
    scrapeOptions?: Record<string, unknown>;
  },
): Promise<FirecrawlSearchResult> {
  return firecrawlPost<FirecrawlSearchResult>(
    apiKey,
    "/v2/search",
    { query, ...options },
    options.timeout ? options.timeout + 5_000 : undefined,
  );
}
