import { expandListField, htmlToPlainText, looksLikeHtml, plainTextField } from "./html-content";

/** Combine stored list values into one HTML string for the rich-text editor. */
export function listFieldHtml(items: string[] | undefined | null): string {
  if (!items?.length) return "";
  if (items.length === 1) return items[0];
  const plain = items.filter(Boolean);
  if (plain.every((item) => !looksLikeHtml(item))) {
    return `<ul>${plain.map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join("")}</ul>`;
  }
  return items[0];
}

/** Merge legacy split prerequisite fields into one list for the editor. */
export function mergePrerequisitesFields(
  prime?: string[] | null,
  client?: string[] | null,
): string[] {
  const p = prime?.filter(Boolean) ?? [];
  const c = client?.filter(Boolean) ?? [];
  if (!p.length && !c.length) return [];
  if (p.length && !c.length) return p;
  if (!p.length && c.length) return c;
  return [listFieldHtml(p) + listFieldHtml(c)];
}

/** Read prerequisites from a service row (supports legacy prime/client columns). */
export function prerequisitesFromService(service: {
  prerequisites?: string[] | null;
  prerequisites_prime?: string[] | null;
  prerequisites_client?: string[] | null;
}): string[] {
  if (service.prerequisites?.length) return service.prerequisites;
  return mergePrerequisitesFields(service.prerequisites_prime, service.prerequisites_client);
}

export function prerequisitesToHtml(service: {
  prerequisites?: string[] | null;
  prerequisites_prime?: string[] | null;
  prerequisites_client?: string[] | null;
}): string {
  return listFieldHtml(prerequisitesFromService(service));
}

/** Persist rich-text editor output as a single-item string array. */
export function setListFieldHtml(html: string): string[] {
  const trimmed = html?.trim() ?? "";
  if (!trimmed || trimmed === "<p></p>") return [];
  return [html];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LegacyBenefit = { title?: string; description?: string };
type LegacyPhase = { name?: string; description?: string };
type LegacyTimeline = { phase?: string; activity?: string; duration?: string };
type LegacyExtra = { title?: string; content?: string };

export function benefitsToHtml(raw: string[] | LegacyBenefit[] | undefined | null): string {
  if (!raw?.length) return "";
  if (typeof raw[0] === "string") return listFieldHtml(raw as string[]);
  const items = (raw as LegacyBenefit[]).map((b) => {
    const title = b.title?.trim() ?? "";
    const description = plainTextField(b.description ?? "");
    if (title && description) return `<li><p><strong>${escapeHtml(title)}</strong>: ${escapeHtml(description)}</p></li>`;
    if (title) return `<li><p><strong>${escapeHtml(title)}</strong></p></li>`;
    return description ? `<li><p>${escapeHtml(description)}</p></li>` : "";
  }).filter(Boolean);
  return items.length ? `<ul>${items.join("")}</ul>` : "";
}

export function approachToHtml(raw: { name?: string; description?: string }[] | undefined | null): string {
  if (!raw?.length) return "";
  if (raw.length === 1 && !raw[0].name?.trim()) return raw[0].description ?? "";
  return raw.map((phase) => {
    const chunks: string[] = [];
    if (phase.name?.trim()) {
      chunks.push(looksLikeHtml(phase.name) ? phase.name : `<p><strong>${escapeHtml(phase.name)}</strong></p>`);
    }
    if (phase.description?.trim()) {
      chunks.push(looksLikeHtml(phase.description) ? phase.description : `<p>${escapeHtml(plainTextField(phase.description))}</p>`);
    }
    return chunks.join("");
  }).join("");
}

export function timelineToHtml(raw: string[] | LegacyTimeline[] | undefined | null): string {
  if (!raw?.length) return "";
  if (typeof raw[0] === "string") return listFieldHtml(raw as string[]);
  const items = (raw as LegacyTimeline[]).map((row) => {
    const line = [row.phase, row.activity, row.duration].filter(Boolean).join(" – ");
    return line ? `<li><p>${escapeHtml(line)}</p></li>` : "";
  }).filter(Boolean);
  return items.length ? `<ul>${items.join("")}</ul>` : "";
}

export function extraSectionsToHtml(raw: string[] | LegacyExtra[] | undefined | null): string {
  if (!raw?.length) return "";
  if (typeof raw[0] === "string") return listFieldHtml(raw as string[]);
  return (raw as LegacyExtra[]).map((sec) => {
    const chunks: string[] = [];
    if (sec.title?.trim()) {
      chunks.push(`<p><strong>${escapeHtml(sec.title)}</strong></p>`);
    }
    if (sec.content?.trim()) {
      chunks.push(looksLikeHtml(sec.content) ? sec.content : `<p>${escapeHtml(plainTextField(sec.content))}</p>`);
    }
    return chunks.join("");
  }).join("");
}

export function normalizeBenefitsForExport(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw) || !raw.length) return [];
  if (typeof raw[0] === "string") return expandListField(raw as string[]);
  return (raw as LegacyBenefit[])
    .map((b) => {
      const title = b.title?.trim() ?? "";
      const description = plainTextField(b.description ?? "");
      return title && description ? `${title}: ${description}` : title || description;
    })
    .filter(Boolean);
}

export function normalizeApproachForExport(raw: { name?: string; description?: string }[] | undefined | null): string {
  return approachToHtml(raw);
}

export function parseTimelineLine(line: string): [string, string, string] {
  const parts = line.split(/\s*[–\-|:]\s*/);
  if (parts.length >= 2) {
    const durationMatch = line.match(/\d+\s*(?:day|week|hour|month)s?/i);
    return [
      parts[0].trim(),
      parts[1]?.trim() ?? "",
      durationMatch?.[0] ?? (parts[2]?.trim() ?? ""),
    ];
  }
  return [line.trim(), "", ""];
}

export function normalizeTimelineForExport(raw: unknown): string[][] {
  if (!raw || !Array.isArray(raw) || !raw.length) return [];
  if (typeof raw[0] === "object" && raw[0] !== null && "phase" in (raw[0] as object)) {
    return (raw as LegacyTimeline[]).map((row) => [row.phase ?? "", row.activity ?? "", row.duration ?? ""]);
  }
  return expandListField(raw as string[]).map((line) => parseTimelineLine(line));
}

export function timelineObjectsFromService(raw: unknown): { phase: string; activity: string; duration: string }[] {
  return normalizeTimelineForExport(raw).map(([phase, activity, duration]) => ({ phase, activity, duration }));
}

export function normalizeExtraSectionsForForm(raw: unknown): { title: string; content: string }[] {
  if (!raw || !Array.isArray(raw) || !raw.length) return [];
  if (typeof raw[0] === "string") {
    return [{ title: "", content: listFieldHtml(raw as string[]) }];
  }
  return (raw as LegacyExtra[]).map((sec) => ({
    title: sec.title ?? "",
    content: sec.content ?? "",
  }));
}

export function normalizeExtraSectionsForExport(raw: unknown): { title: string; content: string }[] {
  if (!raw || !Array.isArray(raw) || !raw.length) return [];
  if (typeof raw[0] === "string") {
    const text = htmlToPlainText(listFieldHtml(raw as string[]));
    return text ? [{ title: "", content: text }] : [];
  }
  return (raw as LegacyExtra[]).map((sec) => ({
    title: sec.title ?? "",
    content: plainTextField(sec.content ?? ""),
  }));
}

export function htmlListFromLines(lines: string[]): string {
  const items = lines.filter(Boolean);
  if (!items.length) return "";
  return `<ul>${items.map((line) => `<li><p>${escapeHtml(line)}</p></li>`).join("")}</ul>`;
}

export function htmlFromBenefitLines(lines: { title: string; description: string }[]): string {
  if (!lines.length) return "";
  return `<ul>${lines.map((line) => {
    if (line.title && line.description) {
      return `<li><p><strong>${escapeHtml(line.title)}</strong>: ${escapeHtml(line.description)}</p></li>`;
    }
    if (line.title) return `<li><p><strong>${escapeHtml(line.title)}</strong></p></li>`;
    return `<li><p>${escapeHtml(line.description)}</p></li>`;
  }).join("")}</ul>`;
}
