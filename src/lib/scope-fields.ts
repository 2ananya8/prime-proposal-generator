export type ScopeField = { title: string; content: string };

const SCOPE_ENGAGEMENT_TITLES = new Set(["scope of engagement", "scope notes"]);

const LEGACY_SCOPE_MAP: [string, string][] = [
  ["applications", "Application(s) in Scope"],
  ["tech_stack", "Technology Stack"],
  ["testing_type", "Testing Type"],
  ["environment", "Testing Environment"],
  ["user_roles", "User Roles in Scope"],
];

export function isScopeEngagementField(title: string): boolean {
  return SCOPE_ENGAGEMENT_TITLES.has(title.trim().toLowerCase());
}

/** Normalize stored scope_details (new `fields` array or legacy flat keys) into scope rows. */
export function normalizeScopeFields(raw: Record<string, unknown> | null | undefined): ScopeField[] {
  if (!raw) return [];
  if (Array.isArray(raw.fields)) {
    return (raw.fields as ScopeField[]).map((f) => ({
      title: String(f.title ?? ""),
      content: String(f.content ?? ""),
    }));
  }
  const fields: ScopeField[] = [];
  for (const [key, label] of LEGACY_SCOPE_MAP) {
    const val = raw[key];
    if (typeof val === "string" && val.trim()) fields.push({ title: label, content: val });
  }
  const scopeText = raw.scope_text;
  if (typeof scopeText === "string" && scopeText.trim()) {
    fields.push({ title: "Scope of Engagement", content: scopeText });
  }
  return fields;
}

export function parseScopeFromDetails(
  scopeDetails: Record<string, unknown> | null | undefined,
): { fields: ScopeField[]; project_overview?: string } {
  if (!scopeDetails) return { fields: [] };
  const { content_overrides: _, project_overview, ...rest } = scopeDetails;
  return {
    fields: normalizeScopeFields(rest),
    project_overview: typeof project_overview === "string" ? project_overview : undefined,
  };
}

export function getApplicationsLabel(fields: ScopeField[]): string {
  const app = fields.find((f) => /application/i.test(f.title));
  return app?.content?.trim() || "[APPLICATION NAME(S)]";
}

export function getScopeEngagementText(fields: ScopeField[]): string {
  const match = fields.find((f) => isScopeEngagementField(f.title));
  return match?.content?.trim() ?? "";
}

export function scopeFieldsToSummaryString(fields: ScopeField[]): string {
  const parts = fields
    .filter((f) => f.title.trim() || f.content.trim())
    .map((f) => f.content.trim() || f.title.trim())
    .filter(Boolean);
  return parts.join("; ") || "the agreed scope";
}

export function upsertScopeEngagementField(fields: ScopeField[], content: string): ScopeField[] {
  const idx = fields.findIndex((f) => isScopeEngagementField(f.title));
  if (idx >= 0) {
    return fields.map((f, i) => (i === idx ? { ...f, content } : f));
  }
  if (!content.trim()) return fields;
  return [...fields, { title: "Scope of Engagement", content }];
}

export function upsertApplicationsField(fields: ScopeField[], content: string): ScopeField[] {
  const idx = fields.findIndex((f) => /application/i.test(f.title));
  if (idx >= 0) {
    return fields.map((f, i) => (i === idx ? { ...f, content } : f));
  }
  if (!content.trim()) return fields;
  return [...fields, { title: "Application(s) in Scope", content }];
}
