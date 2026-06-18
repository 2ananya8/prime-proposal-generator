import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createProposal, createService, listServicesFull } from "@/lib/data-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Plus } from "lucide-react";
import { LOGO_ACCEPT, readLogoFileAsDataUrl, validateLogoDataUrl } from "@/lib/image-upload";
import { researchClient, draftExecutiveSummary } from "@/lib/research.functions";
import { emptyClientResearch, type ClientResearch } from "@/lib/client-research";
import { timelineObjectsFromService } from "@/lib/service-field-helpers";
import { ClientResearchForm } from "@/components/ClientResearchForm";
import { ServiceForm, emptyService, type ServiceFormValue } from "@/components/ServiceForm";
import { ObjectListEditor } from "@/components/ListEditor";
import { ProposalWizardReview } from "@/components/ProposalWizardReview";
import { CommercialsLineItemsEditor } from "@/components/CommercialsLineItemsEditor";
import {
  commercialsSubtotal,
  EMPTY_COMMERCIAL_LINE_ITEM,
  normalizeCommercialLineItems,
  type CommercialLineItem,
} from "@/lib/commercials-line-item";
import { buildWizardPreviewData, type ProposalContentOverrides } from "@/lib/proposal-preview";
import { plainTextField } from "@/lib/html-content";
import { scopeFieldsToSummaryString, type ScopeField } from "@/lib/scope-fields";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  buildExecutiveSummaryFromTemplate,
  resolveExecutiveSummary,
  serviceInputFromRecord,
} from "@/lib/executive-summary-draft";

export const Route = createFileRoute("/_authenticated/proposals/new")({
  head: () => ({ meta: [{ title: "New proposal — Prime Infoserv" }] }),
  component: Wizard,
});

const STEPS = ["Client", "Research", "Service", "Scope", "Executive Summary", "Timeline", "Commercials", "Milestones", "Extras", "Review"] as const;

function Wizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [clientName, setClientName] = useState("");
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [clientWebsite, setClientWebsite] = useState("");
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [research, setResearch] = useState<ClientResearch | null>(null);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [scopeFields, setScopeFields] = useState<ScopeField[]>([]);
  const [projectOverview, setProjectOverview] = useState("");
  /** `null` = user has not edited; any string (including "") = manual user input. */
  const [execSummaryUser, setExecSummaryUser] = useState<string | null>(null);
  const [execSummaryAi, setExecSummaryAi] = useState("");
  const [execSummaryPreferAi, setExecSummaryPreferAi] = useState(false);
  const [draftingSummary, setDraftingSummary] = useState(false);
  const autoAiAttemptedRef = useRef(false);
  const [timeline, setTimeline] = useState<{ phase: string; activity: string; duration: string }[]>([]);
  const [lineItems, setLineItems] = useState<CommercialLineItem[]>([{ ...EMPTY_COMMERCIAL_LINE_ITEM }]);
  const [gst, setGst] = useState(18);
  const [commNotes, setCommNotes] = useState("");
  const [milestones, setMilestones] = useState<{ label: string; percent: number }[]>([
    { label: "Advance", percent: 50 },
    { label: "On completion", percent: 50 },
  ]);
  const [extras, setExtras] = useState<{ title: string; content: string }[]>([]);
  const [contentOverrides, setContentOverrides] = useState<ProposalContentOverrides>({});
  const [saving, setSaving] = useState(false);

  const research_fn = useServerFn(researchClient);
  const draft_fn = useServerFn(draftExecutiveSummary);

  const services = useQuery({ queryKey: ["services-all"], queryFn: listServicesFull });
  const selectedService = useMemo(() => services.data?.find((s: any) => s.id === serviceId), [services.data, serviceId]);

  const executiveSummaryDraftInput = useMemo(() => {
    if (!selectedService) return null;
    const svc = selectedService as Record<string, unknown>;
    return {
      clientName: research?.company_name || clientName,
      clientResearch: research ?? undefined,
      scope: plainTextField(projectOverview) || scopeFieldsToSummaryString(scopeFields),
      service: serviceInputFromRecord(svc),
    };
  }, [selectedService, research, clientName, scopeFields, projectOverview]);

  const execSummaryTemplate = useMemo(
    () => (executiveSummaryDraftInput ? buildExecutiveSummaryFromTemplate(executiveSummaryDraftInput) : null),
    [executiveSummaryDraftInput],
  );

  const resolvedExecSummary = useMemo(
    () => resolveExecutiveSummary({
      userInput: execSummaryUser,
      template: execSummaryTemplate,
      aiInput: execSummaryAi,
      preferAi: execSummaryPreferAi,
    }),
    [execSummaryUser, execSummaryTemplate, execSummaryAi, execSummaryPreferAi],
  );

  const setExecSummaryFromUser = (value: string) => {
    setExecSummaryUser(value.trim() ? value : null);
  };

  const execSummaryFieldValue = execSummaryUser ?? "";
  const execSummaryBlankHint = execSummaryTemplate?.trim()
    ? "Service template will be used when left blank."
    : execSummaryAi.trim()
      ? "AI draft will be used when left blank."
      : draftingSummary
        ? "Generating AI draft…"
        : "Leave blank to use the service template or AI draft.";

  // Pre-fill timeline when service selected
  useEffect(() => {
    if (selectedService && !timeline.length) {
      setTimeline(timelineObjectsFromService((selectedService as any).timeline_phases));
    }
  }, [selectedService]); // eslint-disable-line

  // Reset derived executive-summary state when the service changes.
  useEffect(() => {
    setExecSummaryUser(null);
    setExecSummaryAi("");
    setExecSummaryPreferAi(false);
    autoAiAttemptedRef.current = false;
  }, [serviceId]);

  const lineItemsCalc = useMemo(() => normalizeCommercialLineItems(lineItems), [lineItems]);
  const subtotal = useMemo(() => commercialsSubtotal(lineItemsCalc), [lineItemsCalc]);
  const gstAmount = (subtotal * gst) / 100;
  const total = subtotal + gstAmount;

  const reviewPreview = useMemo(
    () => buildWizardPreviewData({
      clientName,
      clientLogo,
      proposalDate,
      service: selectedService as Record<string, unknown> | undefined,
      contentOverrides,
      executiveSummary: resolvedExecSummary,
      clientResearch: research,
      scope: { fields: scopeFields, project_overview: projectOverview },
      timeline,
      commercials: {
        line_items: lineItemsCalc,
        gst_percent: gst,
        subtotal,
        gst_amount: gstAmount,
        total,
        notes: commNotes,
      },
      milestones,
      extras,
    }),
    [
      clientName, clientLogo, proposalDate, selectedService, contentOverrides, resolvedExecSummary, research,
      scopeFields, projectOverview, timeline, lineItemsCalc, gst, subtotal, gstAmount, total, commNotes, milestones, extras,
    ],
  );

  const applyResearch = (r: ClientResearch) => {
    setResearch(r);
    if (r.website && !clientWebsite) setClientWebsite(r.website);
    if (r.logo_data_url && !clientLogo) {
      const logoCheck = validateLogoDataUrl(r.logo_data_url);
      if (logoCheck.ok) setClientLogo(r.logo_data_url);
    }
  };

  const runResearch = async () => {
    if (!clientName) return toast.error("Enter a client name first");
    setResearching(true);
    setResearchError(null);
    const manual = emptyClientResearch(clientName, clientWebsite);
    if (!research) setResearch(manual);
    try {
      const r = await research_fn({ data: { clientName, clientWebsite: clientWebsite || null } });
      applyResearch(r);
      if (r.research_status === "success") toast.success("Company research complete");
      else if (r.research_status === "partial") toast.message("Partial research — please review and edit the fields");
      else toast.message("Could not auto-research this company — add details manually");
    } catch (e: any) {
      const msg = e.message || "Research failed";
      setResearchError(msg);
      applyResearch({ ...manual, research_notes: msg, research_status: "manual" });
      toast.error("Research failed — you can fill in the details manually");
    } finally {
      setResearching(false);
    }
  };

  const runAiExecutiveSummary = async (preferAi: boolean) => {
    if (!selectedService || !executiveSummaryDraftInput) return toast.error("Pick a service first");
    setDraftingSummary(true);
    if (preferAi) setExecSummaryPreferAi(true);
    try {
      const r = await draft_fn({ data: executiveSummaryDraftInput });
      setExecSummaryAi(r.executive_summary);
      if ("fallback" in r && r.fallback && r.message) toast.message(r.message);
    } catch (e: any) { toast.error(e.message || "Draft failed"); }
    finally { setDraftingSummary(false); }
  };

  const draftSummary = () => runAiExecutiveSummary(true);

  // Auto AI only when there is no user input and no service template.
  useEffect(() => {
    if (step !== 4) return;
    if (execSummaryUser?.trim()) return;
    if (execSummaryTemplate?.trim()) return;
    if (execSummaryAi.trim()) return;
    if (draftingSummary) return;
    if (autoAiAttemptedRef.current) return;
    autoAiAttemptedRef.current = true;
    void runAiExecutiveSummary(false);
  }, [step, execSummaryUser, execSummaryTemplate, execSummaryAi, draftingSummary, executiveSummaryDraftInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = async () => {
    if (step === 0) {
      if (!clientName) return toast.error("Client name required");
      if (!research) setResearch(emptyClientResearch(clientName, clientWebsite));
      setStep(1);
      runResearch();
      return;
    }
    if (step === 2 && !serviceId) return toast.error("Pick a service");
    setStep(Math.min(STEPS.length - 1, step + 1));
  };
  const back = () => setStep(Math.max(0, step - 1));

  const save = async () => {
    setSaving(true);
    try {
      const data = await createProposal({
        client_name: clientName, client_logo: clientLogo, client_website: clientWebsite || null, service_id: serviceId, proposal_date: proposalDate,
        client_research: research, executive_summary: resolvedExecSummary,
        scope_details: { fields: scopeFields, project_overview: projectOverview, content_overrides: contentOverrides },
        timeline_overrides: timeline,
        commercials: { line_items: lineItemsCalc, gst_percent: gst, subtotal, gst_amount: gstAmount, total, notes: commNotes },
        payment_milestones: milestones, extra_fields: extras,
      });
      toast.success("Proposal saved");
      nav({ to: "/proposals/$id", params: { id: data.id } });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/proposals" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="text-2xl font-semibold">New proposal</h1>
      <div className="flex flex-wrap gap-1">
        {STEPS.map((s, i) => (<span key={s} className={`text-xs px-2 py-1 rounded ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</span>))}
      </div>

      {step === 0 && (
        <Card><CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="space-y-1"><Label>Client Name *</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ACME Corp" /></div>
          <div className="space-y-1">
            <Label>Client Logo (optional)</Label>
            <Input
              type="file"
              accept={LOGO_ACCEPT}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return setClientLogo(null);
                try {
                  setClientLogo(await readLogoFileAsDataUrl(file));
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Invalid logo file");
                  e.target.value = "";
                }
              }}
            />
            {clientLogo && <img src={clientLogo} alt="Client logo preview" className="mt-2 h-14 object-contain" />}
            <p className="text-xs text-muted-foreground">PNG, JPG, or JPEG only (max 600 KB). Shown on the proposal cover page.</p>
          </div>
          <div className="space-y-1"><Label>Client Website (optional)</Label><Input value={clientWebsite} onChange={(e) => setClientWebsite(e.target.value)} placeholder="https://acme.com" /></div>
          <div className="space-y-1"><Label>Proposal Date</Label><Input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} /></div>
        </CardContent></Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Client Research
            </CardTitle>
            <Button size="sm" variant="outline" disabled={researching} onClick={runResearch}>
              {researching ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Researching…</> : "Re-run research"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              We search the company website and trusted public sources (via Firecrawl), then extract industry, size, logo, and overview.
              All fields are editable — they feed the Executive Summary in step 5.
            </p>
            {researching && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching {clientName}…
              </p>
            )}
            {researchError && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {researchError}
              </p>
            )}
            {research?.research_notes && !researchError && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{research.research_notes}</p>
            )}
            {research && (
              <ClientResearchForm
                research={research}
                onChange={(r) => {
                  setResearch(r);
                  if (r.company_name !== clientName) setClientName(r.company_name);
                  if (r.website !== clientWebsite) setClientWebsite(r.website);
                }}
                clientLogo={clientLogo}
                onUseLogo={(dataUrl) => setClientLogo(dataUrl)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card><CardHeader className="flex flex-row justify-between items-center"><CardTitle className="text-base">Service</CardTitle><CreateServiceDialog onCreated={(id) => { setServiceId(id); services.refetch(); }} /></CardHeader>
          <CardContent className="space-y-2">
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Pick a service template" /></SelectTrigger>
              <SelectContent>{(services.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedService && <p className="text-xs text-muted-foreground">Type: {(selectedService as any).service_type}</p>}
          </CardContent></Card>
      )}

      {step === 3 && (
        <Card><CardHeader><CardTitle className="text-base">Scope</CardTitle></CardHeader><CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Describe the engagement overview as paragraphs or bullet points — use the toolbar for lists and formatting.
          </p>
          <RichTextEditor
            value={projectOverview}
            onChange={setProjectOverview}
            placeholder="Client, delivery mode, applications in scope, technology stack, etc."
          />
        </CardContent></Card>
      )}

      {step === 4 && (
        <Card><CardHeader className="flex flex-row justify-between items-center"><CardTitle className="text-base">Executive Summary</CardTitle><Button size="sm" variant="outline" disabled={draftingSummary} onClick={draftSummary}>{draftingSummary ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Drafting</> : <><Sparkles className="h-4 w-4 mr-1" />AI draft</>}</Button></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Type to override. {execSummaryBlankHint}
            </p>
            <Textarea
              className="min-h-[260px]"
              value={execSummaryFieldValue}
              onChange={(e) => setExecSummaryFromUser(e.target.value)}
              placeholder="Optional — leave blank to use the service template or AI draft"
            />
          </CardContent></Card>
      )}

      {step === 5 && (
        <Card><CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader><CardContent>
          <ObjectListEditor value={timeline} onChange={setTimeline} fields={[{ key: "phase", label: "Phase" }, { key: "activity", label: "Activity" }, { key: "duration", label: "Duration" }]} template={{ phase: "", activity: "", duration: "" }} />
        </CardContent></Card>
      )}

      {step === 6 && (
        <Card><CardHeader><CardTitle className="text-base">Commercials</CardTitle></CardHeader><CardContent className="space-y-3">
          <CommercialsLineItemsEditor lineItems={lineItems} onChange={setLineItems} />
          <div className="flex items-center gap-3"><Label>GST %</Label><Input className="w-24" type="number" value={gst} onChange={(e) => setGst(Number(e.target.value))} /></div>
          <div className="text-sm space-y-1 border-t pt-2"><div className="flex justify-between"><span>Subtotal</span><span>₹ {subtotal.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>GST</span><span>₹ {gstAmount.toLocaleString("en-IN")}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>₹ {total.toLocaleString("en-IN")}</span></div></div>
          <div className="space-y-1"><Label>Notes</Label><Textarea value={commNotes} onChange={(e) => setCommNotes(e.target.value)} /></div>
        </CardContent></Card>
      )}

      {step === 7 && (
        <Card><CardHeader><CardTitle className="text-base">Payment Milestones</CardTitle></CardHeader><CardContent>
          <ObjectListEditor value={milestones as any} onChange={setMilestones as any} fields={[{ key: "label", label: "Milestone" }, { key: "percent", label: "%" }]} template={{ label: "", percent: 0 } as any} />
        </CardContent></Card>
      )}

      {step === 8 && (
        <Card><CardHeader><CardTitle className="text-base">Extras (optional)</CardTitle></CardHeader><CardContent>
          <p className="text-xs text-muted-foreground mb-3">Add any additional custom sections to include in the proposal.</p>
          <ObjectListEditor value={extras} onChange={setExtras} fields={[{ key: "title", label: "Section Title" }, { key: "content", label: "Content", textarea: true }]} template={{ title: "", content: "" }} />
        </CardContent></Card>
      )}

      {step === 9 && (
        reviewPreview ? (
          <ProposalWizardReview
            preview={reviewPreview}
            clientName={clientName}
            setClientName={setClientName}
            scopeFields={scopeFields}
            setScopeFields={setScopeFields}
            projectOverview={projectOverview}
            setProjectOverview={setProjectOverview}
            execSummary={resolvedExecSummary}
            setExecSummary={setExecSummaryFromUser}
            timeline={timeline}
            setTimeline={setTimeline}
            lineItems={lineItems}
            setLineItems={setLineItems}
            gst={gst}
            setGst={setGst}
            commNotes={commNotes}
            setCommNotes={setCommNotes}
            subtotal={subtotal}
            gstAmount={gstAmount}
            total={total}
            milestones={milestones}
            setMilestones={setMilestones}
            contentOverrides={contentOverrides}
            setContentOverrides={setContentOverrides}
          />
        ) : (
          <Card><CardContent className="py-6 text-sm text-muted-foreground">Select a service template before reviewing the proposal document.</CardContent></Card>
        )
      )}

      <div className="flex justify-between sticky bottom-0 bg-background py-3 border-t">
        <Button variant="ghost" disabled={step === 0} onClick={back}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        {step < STEPS.length - 1 ? <Button onClick={next}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>
          : <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save proposal"}</Button>}
      </div>
    </div>
  );
}

function CreateServiceDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<ServiceFormValue>(emptyService);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!v.name || !v.service_type) return toast.error("Name and Type required");
    setBusy(true);
    try {
      const data = await createService(v);
      toast.success("Service created");
      setOpen(false);
      onCreated(data.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />New service</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New service</DialogTitle></DialogHeader>
        <ServiceForm value={v} onChange={setV} />
        <div className="flex justify-end gap-2 pt-2 border-t sticky bottom-0 bg-background"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save & use"}</Button></div>
      </DialogContent>
    </Dialog>
  );
}