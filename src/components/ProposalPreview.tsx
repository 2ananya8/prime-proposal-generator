import type { ReactNode } from "react";
import type { ProposalPreviewData } from "@/lib/proposal-preview";
import { ProposalCoverPage } from "@/components/ProposalCoverPage";
import { ProposalEndingPage } from "@/components/ProposalEndingPage";
import { ProposalPageFooter, ProposalPageHeader, ProposalPageWatermark } from "@/components/ProposalPageChrome";
import {
  WAPT_DISCLAIMER,
  waptAcknowledgment,
  waptConfidentiality,
  PROPOSAL_TERMS_AND_CONDITIONS_ITEMS,
  type ProposalTermsItem,
} from "@/lib/wapt-template-sections";
import { ProposalRichText } from "@/components/ProposalRichText";
import { plainTextField } from "@/lib/html-content";
import {
  getProposalSectionContent,
  customSectionTitle,
  hasCoverageMatrix,
  hasFilledMilestones,
  hasFilledText,
} from "@/lib/proposal-section-visibility";
import { getApplicationsLabel } from "@/lib/proposal-document-content";
import { CommercialsTable } from "@/components/CommercialsTable";
import { PROPOSAL_FONT_STACK } from "@/lib/proposal-fonts.constants";

const BRAND = "#1F4E79";
const ACCENT = "#D5E8F0";

function Section({ n, title, children, newPage }: { n: number; title: string; children: ReactNode; newPage?: boolean }) {
  return (
    <section className={`mb-7 break-inside-avoid${newPage ? " break-before-page" : ""}`}>
      <h2 className="text-base font-bold pb-1 mb-3" style={{ color: BRAND, borderBottom: `2px solid ${ACCENT}` }}>
        {n}.&nbsp;&nbsp;{title}
      </h2>
      {children}
    </section>
  );
}

function Body({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[13px] leading-relaxed text-gray-800 ${className}`}>{children}</div>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-[13px] leading-relaxed">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function TermsBullets({ items }: { items: ProposalTermsItem[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 text-[13px] leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>
          {item.label ? <><span className="font-semibold">{item.label}: </span><span className="whitespace-pre-line">{item.text}</span></> : <span className="whitespace-pre-line">{item.text}</span>}
        </li>
      ))}
    </ul>
  );
}

import {
  PROPOSAL_TABLE_BODY_CELL_CLASS,
  PROPOSAL_TABLE_CLASS,
  PROPOSAL_TABLE_HEADER_CELL_CLASS,
  PROPOSAL_TABLE_WRAPPER_CLASS,
} from "@/lib/rich-html-table";

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className={PROPOSAL_TABLE_WRAPPER_CLASS}>
      <table className={PROPOSAL_TABLE_CLASS}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className={PROPOSAL_TABLE_HEADER_CELL_CLASS}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : undefined}>
              {row.map((cell, j) => (
                <td key={j} className={PROPOSAL_TABLE_BODY_CELL_CLASS}>{cell || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const APPROACH_INTRO =
  "Prime Infoserv follows the OWASP Testing Guide v4.2 as the primary framework, covering all OWASP TOP 10 (2021) categories as a minimum, with additional testing for business logic and application-specific attack vectors.";

function CustomSectionBody({ content }: { content: string }) {
  return <ProposalRichText content={content} />;
}

export function ProposalPreview({ data }: { data: ProposalPreviewData }) {
  const { clientName, service, commercials } = data;
  const content = getProposalSectionContent(data);
  const applications = getApplicationsLabel(data.scope);
  let sectionNum = 0;
  const next = (title: string, body: ReactNode, opts?: { newPage?: boolean }) => {
    sectionNum += 1;
    return <Section n={sectionNum} title={title} newPage={opts?.newPage}>{body}</Section>;
  };

  return (
    <article
      className="proposal-document bg-white text-gray-900 shadow-xl overflow-hidden print:shadow-none"
      style={{ fontFamily: PROPOSAL_FONT_STACK }}
    >
      <ProposalCoverPage data={data} />

      <div className="proposal-content-pages relative">
        <ProposalPageWatermark />
        <ProposalPageHeader data={data} />
        <div className="proposal-content-body relative z-[1] px-10 py-8">
        {next("Statement of Confidentiality", (
          <Body><p className="whitespace-pre-wrap">{waptConfidentiality(clientName)}</p></Body>
        ))}

        {next("Acknowledgment", (
          <Body><p className="whitespace-pre-wrap">{waptAcknowledgment(clientName, service.name, applications)}</p></Body>
        ))}

        {next("Disclaimer", (
          <Body><p className="whitespace-pre-wrap">{WAPT_DISCLAIMER}</p></Body>
        ))}

        {hasFilledText(content.executiveSummary) ? next("Executive Summary", (
          <Body><ProposalRichText content={content.executiveSummary} /></Body>
        ), { newPage: true }) : null}

        {next("Scope", (
          <Body><ProposalRichText content={content.overviewHtml} /></Body>
        ), hasFilledText(content.executiveSummary) ? undefined : { newPage: true })}

        {hasFilledText(content.projectObjectivesHtml) ? next("Project Objectives", (
          <Body><ProposalRichText content={content.projectObjectivesHtml} /></Body>
        )) : null}

        {hasFilledText(content.expectedBenefitsHtml) ? next("Expected Benefits", (
          <Body><ProposalRichText content={content.expectedBenefitsHtml} /></Body>
        )) : null}

        {content.scopeText ? next("Scope of Engagement", (
          <Body>
            <p className="whitespace-pre-wrap">{content.scopeText}</p>
          </Body>
        )) : null}

        {hasFilledText(content.deliverablesHtml) ? next("Deliverables", (
          <Body><ProposalRichText content={content.deliverablesHtml} /></Body>
        )) : null}

        {hasFilledText(content.approachBody) ? next("Approach & Methodology", (
          <div className="space-y-4">
            <Body><p>{APPROACH_INTRO}</p></Body>
            <Body><ProposalRichText content={content.approachBody} /></Body>
          </div>
        )) : null}

        {hasCoverageMatrix(service) ? (
          <section className="mb-4 break-inside-avoid">
            <h3 className="text-[13px] font-bold mb-2" style={{ color: BRAND }}>
              OWASP TOP 10 (2021) Coverage
            </h3>
            <DataTable headers={service.coverage_matrix.headers} rows={service.coverage_matrix.rows} />
          </section>
        ) : null}

        {content.timelineRows.length ? next("Project Timeline", (
          <DataTable headers={["Phase", "Activity", "Duration"]} rows={content.timelineRows} />
        )) : null}

        {content.prerequisitesHtml ? next("Prerequisites", (
          <Body><ProposalRichText content={content.prerequisitesHtml} /></Body>
        )) : null}

        {content.customSections.map((sec) => next(customSectionTitle(sec.title), (
          <Body><CustomSectionBody content={sec.content} /></Body>
        )))}

        {next("Commercials", (
          <div className="space-y-3">
            <CommercialsTable commercials={commercials} />
            {content.commercialsNotes ? (
              <ProposalRichText content={content.commercialsNotes} className="text-[13px] text-gray-600" />
            ) : null}
          </div>
        ))}

        {hasFilledMilestones(content.milestones) ? next("Payment Milestones", (
          <DataTable
            headers={["Milestone", "% of Total"]}
            rows={content.milestones.map((m) => [m.label, `${m.percent}%`])}
          />
        )) : null}

        {next("Terms & Conditions", <TermsBullets items={PROPOSAL_TERMS_AND_CONDITIONS_ITEMS} />, { newPage: true })}
        </div>
        <ProposalPageFooter />
      </div>

      <div className="proposal-content-pages relative break-before-page">
        <ProposalPageWatermark />
        <ProposalPageHeader data={data} />
        <div className="proposal-content-body relative z-[1] px-10 py-8">
          <ProposalEndingPage />
        </div>
        <ProposalPageFooter />
      </div>
    </article>
  );
}
