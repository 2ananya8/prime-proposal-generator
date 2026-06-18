/** Standard WAPT proposal boilerplate (from WAPT_Proposal_Template.docx). */

export const WAPT_GSTIN = "19AAPCP3814K1ZW";
export const WAPT_TAGLINE = "Our Expertise, Your Shield";
export const WAPT_WEBSITE = "www.primeinfoserv.com";

export function waptConfidentiality(clientName: string) {
  return `This proposal has been prepared by Prime Infoserv Private Limited exclusively for ${clientName} and contains proprietary commercial and technical information. The contents — including methodology, pricing, team structure, and engagement approach — are confidential and intended solely for the authorised representatives of ${clientName}.

This document may not be reproduced, distributed, or disclosed to any third party without prior written consent of Prime Infoserv Private Limited.`;
}

export function waptAcknowledgment(clientName: string, serviceName: string, applications: string) {
  return `Prime Infoserv Pvt. Ltd. sincerely appreciates the opportunity to submit this proposal for ${serviceName}services. We value the trust placed in us and look forward to supporting ${clientName} in strengthening the security posture, resilience, and integrity of its web application and API ecosystem.`;
}

export const WAPT_DISCLAIMER = `Web application penetration tests are point-in-time assessments. Application changes, new feature deployments, or third-party library updates after the testing window may introduce new vulnerabilities not covered by this report.

All testing will be conducted within the agreed scope and rules of engagement. Testing will be performed on the agreed environment (staging / production as specified). Production testing requires separate written approval from the client's authorised representative.`;

export type ProposalTermsItem = { label?: string; text: string };

/** Fixed terms & conditions — same for all proposals regardless of service. */
export const PROPOSAL_TERMS_AND_CONDITIONS_ITEMS: ProposalTermsItem[] = [
  {
    label: "PO to be placed on",
    text: "Prime Infoserv Pvt. Ltd., SDF Building, 5th Floor, Module - 611, Salt Lake Electronic Complex, Sech Bhawan, North 24 Parganas, Saltlake, West Bengal, India, 700091",
  },
  {
    label: "GSTIN/UIN",
    text:
      "19AAPCP3814K1ZW\nPlease pay by A/C Payee Cheque/Draft in favor of \"Prime Infoserv Pvt. Ltd.\" payable at Kolkata or by NEFT/RTGS (Banker's Name: ICICI Bank Limited Branch: Salt Lake, Sector V- Cabus Branch, Kolkata 700091 Account No.: 105605501051 Account Type: Current RTGS/NEFT/IFSC Code: ICIC0001056 Swift Code – ICICINBBCTS)",
  },
  {
    text: "GST will be charged extra. The taxes will be applicable on actual as per prevailing GST norms during invoice generation.",
  },
  { label: "Payment Terms", text: "100% Advance along with technically and commercially cleared PO" },
  {
    label: "Mode of Execution",
    text: "The complete audit will be carried out remotely unless onsite presence is explicitly requested. If the client is in Kolkata, an onsite visit can be arranged upon request. For any onsite visit outside Kolkata, the client will be responsible for providing logistics, accommodation, and local travel for Prime Infoserv consultants.",
  },
  {
    label: "Client Responsibilities",
    text: "The client must assign a single point of contact (SPOC) for coordination, disclose all relevant information, workflows, access credentials, and policies required for the VAPT, and ensure stable test environments throughout the assessment. Need a separate desktop at the customer side to run WAPT remotely.",
  },
  {
    label: "Remediation Limitation",
    text: "Prime Infoserv will provide findings and recommendations only, fixing vulnerabilities is not included in the scope.",
  },
  {
    label: "Validity",
    text: "This offer is valid for 7 days from the date of quotation (as per Prime's standard format).",
  },
  {
    label: "Revalidation Environment",
    text: "The client must ensure necessary access and configurations are ready for revalidation testing.",
  },
  {
    label: "Liability",
    text: "Prime Infoserv shall not be liable for any indirect, incidental, or consequential damages, including loss of business or data, arising during or after the testing.",
  },
  { text: "All disputes will be subject to Kolkata Jurisdiction." },
  { text: "Force Majeure clause applicable." },
];
