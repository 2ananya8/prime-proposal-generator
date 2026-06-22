import type { ProposalPreviewData } from "./proposal-preview";
import { getFilledTimelineRows } from "./proposal-section-visibility";
import {
  WAPT_DISCLAIMER,
  WAPT_GSTIN,
  WAPT_TAGLINE,
  WAPT_WEBSITE,
  waptAcknowledgment,
  waptConfidentiality,
} from "./wapt-template-sections";

export const WAPT_APPROACH_INTRO =
  "Prime Infoserv follows the OWASP Testing Guide v4.2 as the primary framework, covering all OWASP TOP 10 (2021) categories as a minimum, with additional testing for business logic and application-specific attack vectors.";

import { getApplicationsLabel as applicationsFromFields } from "./scope-fields";

export function getApplicationsLabel(scope: ProposalPreviewData["scope"]): string {
  return applicationsFromFields(scope.fields);
}

export function getTimelineRows(data: ProposalPreviewData): string[][] {
  const timelineRows = data.timeline.map((t) => [t.phase || "", t.activity || "", t.duration || ""]);
  return getFilledTimelineRows(timelineRows);
}

export function formatCoverDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
    : day % 10 === 3 && day !== 13 ? "rd"
    : "th";
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `${String(day).padStart(2, "0")}${suffix} ${month} ${d.getFullYear()}`;
}

export function getCoverFields(data: ProposalPreviewData) {
  return {
    tagline: WAPT_TAGLINE,
    website: WAPT_WEBSITE,
    gstin: WAPT_GSTIN,
    serviceName: data.service.name,
    clientName: data.clientName,
    proposalDate: formatCoverDate(data.proposalDate),
    clientLogo: data.clientLogo ?? null,
    confidentiality: waptConfidentiality(data.clientName),
    acknowledgment: waptAcknowledgment(data.clientName, data.service.name, getApplicationsLabel(data.scope)),
    disclaimer: WAPT_DISCLAIMER,
  };
}
