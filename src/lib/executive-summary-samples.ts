/** Past proposal excerpts — included in the AI prompt as guidelines, never used as output. */
export type ExecutiveSummaryReferenceKind = "wapt" | "vapt";

export type ExecutiveSummarySampleReference = {
  pastClientName: string;
  serviceRequested: string;
  sampleText: string;
};

const WAPT_SAMPLE = `In today's rapidly evolving digital landscape, web applications serve as a critical interface between organizations and their customers, partners, and internal users. As reliance on web-based platforms continues to grow, these applications increasingly become prime targets for cyber threats such as unauthorized access, data breaches, injection attacks, and exploitation of application vulnerabilities. Ensuring the security and resilience of web applications is therefore essential for protecting sensitive information, maintaining business continuity, and meeting regulatory and compliance requirements.

Prime Infoserv Pvt. Ltd. proposes to conduct a comprehensive Web Application Penetration Testing (WAPT) engagement for {{CLIENT_NAME}} to evaluate the security posture of its web applications. The assessment is designed to identify potential vulnerabilities, security misconfigurations, and application logic weaknesses that could be exploited by malicious actors.

The engagement will involve a combination of automated vulnerability scanning and controlled manual penetration testing techniques performed by experienced security professionals. The testing approach will simulate real-world attack scenarios to evaluate how an attacker might attempt to exploit weaknesses within the application environment. This includes the assessment of authentication mechanisms, session management, input validation, authorization controls, and other critical application security components.

The assessment will follow industry-recognized security standards and best practices, including the OWASP Testing Guide, OWASP Top 10, and commonly accepted vulnerability scoring frameworks such as the Common Vulnerability Scoring System (CVSS). These methodologies ensure a structured, comprehensive, and risk-based evaluation of the application security posture.

Upon completion of the engagement, {{CLIENT_NAME}} will receive a detailed assessment report outlining identified vulnerabilities, their severity levels, potential impact, proof-of-concept validation where applicable, and practical remediation recommendations. The report will enable technical teams to prioritize corrective actions and strengthen the overall security of the web applications.

Through this engagement, {{CLIENT_NAME}} will gain improved visibility into its application security risks, reduce exposure to potential cyber threats, enhance regulatory and compliance readiness, and strengthen the overall resilience of its digital platforms.`;

const VAPT_SAMPLE = `The increasing dependence on digital infrastructure, network connectivity, and online applications has significantly expanded the cyber threat landscape for modern organizations. Cyber threats such as unauthorized access, malware attacks, data breaches, and exploitation of system vulnerabilities pose serious risks to business operations, regulatory compliance, and the confidentiality and integrity of sensitive information.

To address these risks, Vulnerability Assessment and Penetration Testing (VAPT) is a critical security assessment process designed to identify, analyse, and validate vulnerabilities within an organization's IT environment before they can be exploited by malicious actors.

Prime Infoserv Pvt. Ltd. proposes to conduct a comprehensive Vulnerability Assessment and Penetration Testing (VAPT) engagement for {{CLIENT_NAME}} to assess the security posture of its IT environment. The objective of this engagement is to conduct a comprehensive security assessment of the target systems, applications, and network infrastructure to identify potential vulnerabilities, misconfigurations, and security weaknesses. The assessment will involve both automated scanning and controlled manual testing techniques to simulate real-world attack scenarios and determine the potential impact of identified vulnerabilities.

Through this engagement, {{CLIENT_NAME}} will gain a clear understanding of its current security posture and the risks associated with existing vulnerabilities. All findings will be analysed and categorized based on their severity and potential impact, enabling the organization to prioritize remediation efforts effectively.

The assessment will follow industry-recognized standards and best practices, including references to Open Web Application Security Project guidelines, vulnerability scoring methodologies such as Common Vulnerability Scoring System, and applicable regulatory and security compliance requirements.

Upon completion of the engagement, a comprehensive VAPT report will be provided to {{CLIENT_NAME}} containing detailed vulnerability findings, risk classifications, proof-of-concept validation where applicable, and practical remediation recommendations. A re-validation assessment may also be conducted to verify the successful closure of critical vulnerabilities after remediation.

By undertaking this assessment, {{CLIENT_NAME}} will strengthen its cyber security posture, reduce exposure to potential cyber-attacks, enhance regulatory compliance readiness, and improve the overall resilience of its IT infrastructure against evolving security threats.`;

const WAPT_REFERENCE: ExecutiveSummarySampleReference = {
  pastClientName: "VYOMA INNOVUS GLOBAL PRIVATE LIMITED",
  serviceRequested: "Web Application Penetration Testing (WAPT)",
  sampleText: WAPT_SAMPLE.replaceAll("{{CLIENT_NAME}}", "VYOMA INNOVUS GLOBAL PRIVATE LIMITED"),
};

const VAPT_REFERENCE: ExecutiveSummarySampleReference = {
  pastClientName: "SCS Tech",
  serviceRequested: "Vulnerability Assessment and Penetration Testing (VAPT)",
  sampleText: VAPT_SAMPLE.replaceAll("{{CLIENT_NAME}}", "SCS Tech"),
};

export function resolveExecutiveSummaryReferenceKind(service: {
  name?: string;
  service_type?: string;
  short_code?: string;
}): ExecutiveSummaryReferenceKind | null {
  const blob = `${service.name ?? ""} ${service.service_type ?? ""} ${service.short_code ?? ""}`.toLowerCase();
  if (/wapt|web application penetration|web app penetration/.test(blob)) return "wapt";
  if (/\bvapt\b|vulnerability assessment and penetration/.test(blob)) return "vapt";
  return null;
}

/** Past proposal sample for the AI prompt — only when service matches WAPT or VAPT. */
export function getExecutiveSummarySampleForService(service: {
  name?: string;
  service_type?: string;
  short_code?: string;
}): ExecutiveSummarySampleReference | null {
  const kind = resolveExecutiveSummaryReferenceKind(service);
  if (kind === "wapt") return WAPT_REFERENCE;
  if (kind === "vapt") return VAPT_REFERENCE;
  return null;
}

export function formatCurrentServiceRequested(service: {
  name?: string;
  service_type?: string;
  short_code?: string;
}): string {
  const name = service.name?.trim();
  const type = service.service_type?.trim();
  if (name && type && name.toLowerCase() !== type.toLowerCase()) return `${name} (${type})`;
  return name || type || "the requested service";
}
