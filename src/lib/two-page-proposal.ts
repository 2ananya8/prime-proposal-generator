import { looksLikeHtml, plainTextField } from "./html-content";

export type TwoPageLetterFields = {
  client_contact_name: string;
  client_designation: string;
  client_name: string;
  engagement_name: string;
  engagement_scope_list: string;
};

export const EMPTY_TWO_PAGE_LETTER_FIELDS: TwoPageLetterFields = {
  client_contact_name: "",
  client_designation: "",
  client_name: "",
  engagement_name: "",
  engagement_scope_list: "",
};

export const TWO_PAGE_LETTER_TEMPLATE = `{{date}}

**To**
{{client_contact_name}}
{{client_designation}}
{{client_name}}

**Subject:** Proposal for {{engagement_name}}

Dear Sir/Madam,

With reference to your requirement for **{{engagement_name}}**, we at **Prime Infoserv Pvt. Ltd.** are pleased to submit our proposal for your kind consideration.


The proposed engagement will cover support for the following:
{{engagement_scope_list}}

This engagement is designed to assist your organization in maintaining and enhancing its management systems, certifications, compliance posture, and process maturity, as applicable. Depending on the scope, the services may include surveillance audits, recertification support, assessments, gap analysis, implementation assistance, compliance validation, or other related activities to ensure continued conformance with applicable standards, regulatory requirements, and industry best practices.


Thank you for considering our proposal. We look forward to the opportunity to partner with your organization and establish a long-term, mutually beneficial relationship.


Yours sincerely,

**For Prime Infoserv Pvt. Ltd.**



(SUSHOBHAN MUKHERJEE)
GSM: +91 9830017040`;

const LETTER_FIELD_KEYS = Object.keys(EMPTY_TWO_PAGE_LETTER_FIELDS) as (keyof TwoPageLetterFields)[];

export function formatProposalLetterDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function plainLetterToHtml(text: string): string {
  const parts: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      parts.push("<p><br /></p>");
      return;
    }
    const inner = paragraphLines.map((line) => inlineMarkdownToHtml(line)).join("<br />");
    parts.push(`<p>${inner}</p>`);
    paragraphLines = [];
  };

  for (const line of text.split("\n")) {
    if (line.trim() === "") flushParagraph();
    else paragraphLines.push(line);
  }
  flushParagraph();

  return parts.join("");
}

const SCOPE_PLACEHOLDER = "{{engagement_scope_list}}";

function formatEngagementScope(scope: string, preview: boolean): string {
  if (!plainTextField(scope)) {
    return preview ? `<p>${SCOPE_PLACEHOLDER}</p>` : "";
  }
  if (looksLikeHtml(scope)) return scope;
  return scope
    .split(/\n\n+/)
    .map((block) => {
      const inner = block.split("\n").map((line) => inlineMarkdownToHtml(line)).join("<br />");
      return `<p>${inner}</p>`;
    })
    .join("");
}

function fillLetterText(
  text: string,
  fields: TwoPageLetterFields,
  proposalDate: string,
  preview: boolean,
): string {
  const pick = (key: keyof TwoPageLetterFields, value: string) =>
    value.trim() || (preview ? `{{${key}}}` : "");

  let result = text;
  result = fillToken(result, "date", formatProposalLetterDate(proposalDate));
  result = fillToken(result, "client_contact_name", pick("client_contact_name", fields.client_contact_name));
  result = fillToken(result, "client_designation", pick("client_designation", fields.client_designation));
  result = fillToken(result, "client_name", pick("client_name", fields.client_name));
  result = fillToken(result, "engagement_name", pick("engagement_name", fields.engagement_name));
  return result;
}

function fillToken(text: string, token: string, value: string): string {
  const re = new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, "gi");
  return text.replace(re, value);
}

export function buildTwoPageLetter(
  fields: TwoPageLetterFields,
  proposalDate: string,
  opts?: { preview?: boolean },
): string {
  const preview = opts?.preview ?? false;
  const [before, after] = TWO_PAGE_LETTER_TEMPLATE.split(SCOPE_PLACEHOLDER);
  const scopeHtml = formatEngagementScope(fields.engagement_scope_list, preview);
  return (
    plainLetterToHtml(fillLetterText(before, fields, proposalDate, preview))
    + scopeHtml
    + plainLetterToHtml(fillLetterText(after, fields, proposalDate, preview))
  );
}

export function parseTwoPageLetterFields(proposal: {
  client_name?: string;
  scope_details?: unknown;
}): TwoPageLetterFields {
  const stored = (proposal.scope_details as { letter_fields?: Partial<TwoPageLetterFields> & { client_company?: string } } | null)?.letter_fields;
  const merged: TwoPageLetterFields = {
    ...EMPTY_TWO_PAGE_LETTER_FIELDS,
    ...(stored ?? {}),
    client_name:
      stored?.client_name?.trim()
      || stored?.client_company?.trim()
      || proposal.client_name?.trim()
      || "",
  };
  return merged;
}

export function hasStoredTwoPageLetterFields(proposal: { scope_details?: unknown }): boolean {
  const stored = (proposal.scope_details as { letter_fields?: unknown } | null)?.letter_fields;
  return !!stored && typeof stored === "object";
}

export function hasCustomTwoPageLetter(proposal: { scope_details?: unknown }): boolean {
  return !!(proposal.scope_details as { letter_customized?: boolean } | null)?.letter_customized;
}

export function letterFieldsToScopeDetails(
  fields: TwoPageLetterFields,
  letterCustomized = false,
): Record<string, unknown> {
  const letter_fields: Record<string, string> = {};
  for (const key of LETTER_FIELD_KEYS) {
    letter_fields[key] = fields[key];
  }
  return { letter_fields, letter_customized: letterCustomized };
}
