import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { expandListField, plainTextField, looksLikeHtml } from "@/lib/html-content";
import { ProposalRichText } from "@/components/ProposalRichText";
import { getTimelineRows, WAPT_APPROACH_INTRO } from "@/lib/proposal-document-content";
import { customSectionTitle, getFilledCustomSections, getProjectOverviewHtml, hasFilledText } from "@/lib/proposal-section-visibility";
import {
  getApplicationsLabel,
  getScopeEngagementText,
  upsertApplicationsField,
  upsertScopeEngagementField,
  type ScopeField,
} from "@/lib/scope-fields";
import {
  PROPOSAL_TERMS_AND_CONDITIONS_ITEMS,
  WAPT_DISCLAIMER,
  waptAcknowledgment,
  waptConfidentiality,
} from "@/lib/wapt-template-sections";
import type { ProposalContentOverrides, ProposalPreviewData } from "@/lib/proposal-preview";
import {
  approachToHtml,
  benefitsToHtml,
  listFieldHtml,
  normalizeApproachForExport,
  prerequisitesFromService,
  setListFieldHtml,
} from "@/lib/service-field-helpers";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ObjectListEditor } from "@/components/ListEditor";
import { MilestonesEditor } from "@/components/MilestonesEditor";
import { CommercialsTable } from "@/components/CommercialsTable";
import { CommercialsLineItemsEditor } from "@/components/CommercialsLineItemsEditor";
import type { CommercialLineItem } from "@/lib/commercials-line-item";

const BRAND = "#1F4E79";
import {
  PROPOSAL_TABLE_BODY_CELL_CLASS,
  PROPOSAL_TABLE_CLASS,
  PROPOSAL_TABLE_HEADER_CELL_CLASS,
  PROPOSAL_TABLE_WRAPPER_CLASS,
} from "@/lib/rich-html-table";

function DocSection({
  n,
  title,
  preview,
  editor,
  readOnly = false,
}: {
  n: number;
  title: string;
  preview: ReactNode;
  editor?: ReactNode;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <CardTitle className="text-base font-bold" style={{ color: BRAND }}>
          {n}.&nbsp;&nbsp;{title}
        </CardTitle>
        {!readOnly && editor ? (
          <Button type="button" size="sm" variant={editing ? "secondary" : "outline"} onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {editing ? "Done" : "Edit"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0 text-sm leading-relaxed">{editing && editor ? editor : preview}</CardContent>
    </Card>
  );
}

function BulletPreview({ items }: { items: string[] }) {
  const expanded = expandListField(items);
  if (!expanded.length) return <p className="text-muted-foreground">—</p>;
  return (
    <ul className="list-disc pl-5 space-y-1">
      {expanded.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function TablePreview({ headers, rows }: { headers: string[]; rows: string[][] }) {
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
            <tr key={i}>
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

type LineItem = CommercialLineItem;
type Milestone = { label: string; percent: number };
type TimelineRow = { phase: string; activity: string; duration: string };
type ScopeState = ScopeField[];

export type ProposalWizardReviewProps = {
  preview: ProposalPreviewData;
  clientName: string;
  setClientName: (v: string) => void;
  scopeFields: ScopeState;
  setScopeFields: (v: ScopeState) => void;
  projectOverview: string;
  setProjectOverview: (v: string) => void;
  execSummary: string;
  setExecSummary: (v: string) => void;
  timeline: TimelineRow[];
  setTimeline: (v: TimelineRow[]) => void;
  lineItems: LineItem[];
  setLineItems: (v: LineItem[]) => void;
  gst: number;
  setGst: (v: number) => void;
  commNotes: string;
  setCommNotes: (v: string) => void;
  subtotal: number;
  gstAmount: number;
  total: number;
  milestones: Milestone[];
  setMilestones: (v: Milestone[]) => void;
  contentOverrides: ProposalContentOverrides;
  setContentOverrides: (v: ProposalContentOverrides) => void;
};

export function ProposalWizardReview(props: ProposalWizardReviewProps) {
  const {
    preview, clientName, setClientName, scopeFields, setScopeFields,
    projectOverview, setProjectOverview,
    execSummary, setExecSummary,
    timeline, setTimeline, lineItems, setLineItems, gst, setGst, commNotes, setCommNotes,
    subtotal, gstAmount, total, milestones, setMilestones,
    contentOverrides, setContentOverrides,
  } = props;

  const { service, commercials } = preview;
  const applications = getApplicationsLabel(scopeFields);
  const scopeEngagementText = getScopeEngagementText(scopeFields);
  const projectOverviewHtml = getProjectOverviewHtml(preview);
  const timelineRows = getTimelineRows(preview);
  const customSections = getFilledCustomSections(preview);

  const patchOverride = (patch: Partial<ProposalContentOverrides>) =>
    setContentOverrides({ ...contentOverrides, ...patch });

  const objectives = service.project_objectives ?? [];
  const benefitsHtml = benefitsToHtml(service.expected_benefits);
  const deliverables = service.deliverables ?? [];
  const deliverablesHtml = listFieldHtml(deliverables);
  const approachBody = normalizeApproachForExport(service.approach_methodology);
  const prerequisites = prerequisitesFromService(service);

  let sectionNum = 0;
  const nextNum = () => ++sectionNum;

  const richListEditor = (
    label: string,
    value: string[],
    onSave: (html: string) => void,
    placeholder: string,
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <RichTextEditor value={listFieldHtml(value)} onChange={onSave} placeholder={placeholder} />
    </div>
  );

  const approachEditor = richListEditor(
    "Approach & methodology content",
    [approachToHtml(service.approach_methodology)],
    (html) => patchOverride({ approach_methodology: [{ name: "", description: html }] }),
    "Describe approach and methodology…",
  );

  return (
    <div className="proposal-wizard-review space-y-4">
      <p className="text-sm text-muted-foreground">
        This is how your proposal document will read. Each numbered section matches the generated DOCX/PDF. Use <strong>Edit</strong> to change content before saving.
      </p>

      <DocSection
        n={nextNum()}
        title="Statement of Confidentiality"
        preview={<p className="whitespace-pre-wrap">{waptConfidentiality(clientName)}</p>}
        editor={
          <div className="space-y-1">
            <Label>Client name (updates this section)</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
        }
      />

      <DocSection
        n={nextNum()}
        title="Acknowledgment"
        preview={<p className="whitespace-pre-wrap">{waptAcknowledgment(clientName, service.name, applications)}</p>}
        editor={
          <div className="space-y-3">
            <div className="space-y-1"><Label>Client name</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Application(s) in scope</Label>
              <Input
                value={applications === "[APPLICATION NAME(S)]" ? "" : applications}
                onChange={(e) => setScopeFields(upsertApplicationsField(scopeFields, e.target.value))}
              />
            </div>
          </div>
        }
      />

      <DocSection
        n={nextNum()}
        title="Disclaimer"
        readOnly
        preview={<p className="whitespace-pre-wrap">{WAPT_DISCLAIMER}</p>}
      />

      <DocSection
        n={nextNum()}
        title="Executive Summary"
        preview={
          execSummary.trim()
            ? <ProposalRichText content={execSummary} className="text-sm leading-relaxed" />
            : <p className="text-muted-foreground">—</p>
        }
        editor={
          <div className="space-y-1">
            <Label>Executive Summary</Label>
            <RichTextEditor className="min-h-[220px]" value={execSummary} onChange={setExecSummary} />
          </div>
        }
      />

      <DocSection
        n={nextNum()}
        title="Scope"
        preview={
          hasFilledText(projectOverviewHtml)
            ? <ProposalRichText content={projectOverviewHtml} className="text-sm leading-relaxed" />
            : <p className="text-muted-foreground">—</p>
        }
        editor={
          <div className="space-y-1">
            <Label>Scope</Label>
            <RichTextEditor
              value={projectOverview}
              onChange={setProjectOverview}
              placeholder="Use paragraphs or bullet lists for project overview details…"
            />
          </div>
        }
      />

      {hasFilledText(listFieldHtml(objectives)) ? (
        <DocSection
          n={nextNum()}
          title="Project Objectives"
          preview={<ProposalRichText content={listFieldHtml(objectives)} className="text-sm leading-relaxed" />}
          editor={richListEditor(
            "Project objectives",
            objectives,
            (html) => patchOverride({ project_objectives: setListFieldHtml(html) }),
            "List objectives — use bullet lists in the toolbar",
          )}
        />
      ) : null}

      {hasFilledText(benefitsHtml) ? (
        <DocSection
          n={nextNum()}
          title="Expected Benefits"
          preview={<ProposalRichText content={benefitsHtml} className="text-sm leading-relaxed" />}
          editor={richListEditor(
            "Expected benefits",
            [benefitsHtml],
            (html) => patchOverride({ expected_benefits: setListFieldHtml(html) }),
            "List benefits — use bullet lists in the toolbar",
          )}
        />
      ) : null}

      {scopeEngagementText ? (
        <DocSection
          n={nextNum()}
          title="Scope of Engagement"
          preview={
            scopeEngagementText.trim()
              ? <ProposalRichText content={scopeEngagementText} className="text-sm leading-relaxed" />
              : <p className="text-muted-foreground">—</p>
          }
          editor={
            <div className="space-y-1">
              <Label>Scope of Engagement</Label>
              <RichTextEditor
                value={scopeEngagementText}
                onChange={(html) => setScopeFields(upsertScopeEngagementField(scopeFields, html))}
              />
            </div>
          }
        />
      ) : null}

      {hasFilledText(deliverablesHtml) ? (
        <DocSection
          n={nextNum()}
          title="Deliverables"
          preview={<ProposalRichText content={deliverablesHtml} className="text-sm leading-relaxed" />}
          editor={richListEditor(
            "Deliverables",
            deliverables,
            (html) => patchOverride({ deliverables: setListFieldHtml(html) }),
            "List deliverables — use bullet lists in the toolbar",
          )}
        />
      ) : null}

      {hasFilledText(approachBody) ? (
        <DocSection
          n={nextNum()}
          title="Approach & Methodology"
          preview={
            <div className="space-y-3">
              <p>{WAPT_APPROACH_INTRO}</p>
              <ProposalRichText content={approachBody} />
            </div>
          }
          editor={
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">The OWASP intro paragraph is fixed. Edit the methodology content below.</p>
              {approachEditor}
            </div>
          }
        />
      ) : null}

      {service.coverage_matrix?.headers && service.coverage_matrix.rows?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold" style={{ color: BRAND }}>OWASP TOP 10 (2021) Coverage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TablePreview headers={service.coverage_matrix.headers} rows={service.coverage_matrix.rows} />
          </CardContent>
        </Card>
      ) : null}

      {timelineRows.length ? (
        <DocSection
          n={nextNum()}
          title="Project Timeline"
          preview={<TablePreview headers={["Phase", "Activity", "Duration"]} rows={timelineRows} />}
          editor={
            <ObjectListEditor
              value={timeline}
              onChange={setTimeline}
              fields={[{ key: "phase", label: "Phase" }, { key: "activity", label: "Activity" }, { key: "duration", label: "Duration" }]}
              template={{ phase: "", activity: "", duration: "" }}
            />
          }
        />
      ) : null}

      {prerequisites.length ? (
        <DocSection
          n={nextNum()}
          title="Prerequisites"
          preview={<ProposalRichText content={listFieldHtml(prerequisites)} className="text-sm leading-relaxed" />}
          editor={richListEditor(
            "Prerequisites",
            prerequisites,
            (html) => patchOverride({ prerequisites: setListFieldHtml(html) }),
            "List prerequisites…",
          )}
        />
      ) : null}

      {customSections.map((sec) => (
        <DocSection
          key={`${sec.title}-${sec.content.slice(0, 32)}`}
          n={nextNum()}
          title={customSectionTitle(sec.title)}
          preview={<ProposalRichText content={sec.content} className="text-sm leading-relaxed" />}
        />
      ))}

      <DocSection
        n={nextNum()}
        title="Commercials"
        preview={
          <div className="space-y-3">
            <CommercialsTable
              commercials={commercials}
              className="w-full text-sm border-collapse"
              cellClassName="px-3 py-2 border border-gray-300 align-top"
            />
            {commercials.notes ? <ProposalRichText content={commercials.notes} className="text-muted-foreground text-sm" /> : null}
          </div>
        }
        editor={
          <div className="space-y-3">
            <CommercialsLineItemsEditor lineItems={lineItems} onChange={setLineItems} />
            <div className="flex items-center gap-3"><Label>GST %</Label><Input className="w-24" type="number" value={gst} onChange={(e) => setGst(Number(e.target.value))} /></div>
            <div className="text-sm space-y-1 border-t pt-2">
              <div className="flex justify-between"><span>Subtotal</span><span>₹ {subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>GST</span><span>₹ {gstAmount.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>₹ {total.toLocaleString("en-IN")}</span></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><RichTextEditor value={commNotes} onChange={setCommNotes} /></div>
          </div>
        }
      />

      {milestones.length ? (
        <DocSection
          n={nextNum()}
          title="Payment Milestones"
          preview={
            <TablePreview
              headers={["Milestone", "% of Total"]}
              rows={milestones.map((m) => [m.label, `${m.percent}%`])}
            />
          }
          editor={
            <MilestonesEditor value={milestones} onChange={setMilestones} />
          }
        />
      ) : null}

      <DocSection
        n={nextNum()}
        title="Terms & Conditions"
        readOnly
        preview={
          <ul className="list-disc pl-5 space-y-2">
            {PROPOSAL_TERMS_AND_CONDITIONS_ITEMS.map((item, i) => (
              <li key={i}>
                {item.label ? <><span className="font-semibold">{item.label}: </span>{item.text}</> : item.text}
              </li>
            ))}
          </ul>
        }
      />

      <p className="text-xs text-muted-foreground">
        Saving creates the proposal. Generate DOCX and PDF from the proposal page.
      </p>
    </div>
  );
}
