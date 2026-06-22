import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ProposalRichText } from "@/components/ProposalRichText";
import { toast } from "sonner";
import { ArrowLeft, Eye, Loader2, Sparkles, Trash2 } from "lucide-react";
import { lineItemAmount } from "@/lib/commercials-line-item";
import { generateProposalFilesLocally } from "@/lib/generate-proposal-files";
import { Input } from "@/components/ui/input";
import { deleteProposal, getProposal, updateProposalClientLogo, updateProposalSummary } from "@/lib/data-api";
import { LOGO_ACCEPT, readLogoFileAsDataUrl } from "@/lib/image-upload";
import { buildProposalPreview } from "@/lib/proposal-preview";
import { useAuth } from "@/lib/auth";
import { canEditProposal } from "@/lib/permissions";
import { authRequired } from "@/lib/auth-session";

export const Route = createFileRoute("/_authenticated/proposals/$id")({
  component: ProposalDetail,
});

function ProposalDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const auth = useAuth();
  const [generating, setGenerating] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summary, setSummary] = useState("");

  const q = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const data = await getProposal(id);
      setSummary(data.executive_summary ?? "");
      return data;
    },
  });
  const p = q.data;

  const triggerDownload = (base64: string, filename: string, mime: string) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generate = async () => {
    if (!p) return;
    const service = (p as any).service;
    if (!service) return toast.error("Linked service was deleted — cannot generate.");

    const previewData = buildProposalPreview(p);
    if (!previewData) return toast.error("Cannot build proposal document — missing service data.");

    setGenerating(true);
    try {
      const { docxBase64, pdfBase64 } = await generateProposalFilesLocally(previewData);
      const safeClient = p.client_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const base = `${safeClient}-${service.short_code || service.service_type}`;
      triggerDownload(docxBase64, `${base}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      triggerDownload(pdfBase64, `${base}.pdf`, "application/pdf");
      toast.success("DOCX and PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveClientLogo = async (logo: string | null) => {
    try {
      await updateProposalClientLogo(id, logo);
      toast.success(logo ? "Client logo saved" : "Client logo removed");
      q.refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to save logo");
    }
  };

  const saveSummary = async () => {
    try {
      await updateProposalSummary(id, summary);
      toast.success("Saved");
      setEditingSummary(false);
      q.refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const del = async () => {
    if (!confirm("Delete this proposal?")) return;
    try {
      await deleteProposal(id);
      nav({ to: "/proposals" });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  if (q.isLoading) return <p>Loading…</p>;
  if (!p) return <p>Not found.</p>;
  const editable = !authRequired() || canEditProposal(auth.profile, auth.user?.id, p);
  const commercials = p.commercials as any;
  const research = p.client_research as any;

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/proposals" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-4 w-4" />Back</Link>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{p.client_name}</h1>
          <p className="text-sm text-muted-foreground">{(p.service as any)?.name ?? "—"} · {p.proposal_date}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link to="/proposals/$id/preview" params={{ id }}>
            <Button variant="outline"><Eye className="h-4 w-4 mr-1" />Preview</Button>
          </Link>
          <Button onClick={generate} disabled={generating}>{generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating</> : <><Sparkles className="h-4 w-4 mr-1" />Generate DOCX/PDF</>}</Button>
          {editable ? (
            <Button variant="ghost" size="icon" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cover Page — Client Logo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(p as any).client_logo && (
            <img src={(p as any).client_logo} alt={p.client_name} className="h-14 object-contain" />
          )}
          {editable ? (
            <>
              <Input
                type="file"
                accept={LOGO_ACCEPT}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await saveClientLogo(await readLogoFileAsDataUrl(file));
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Invalid logo file");
                    e.target.value = "";
                  }
                }}
              />
              {(p as any).client_logo && (
                <Button size="sm" variant="ghost" onClick={() => saveClientLogo(null)}>Remove logo</Button>
              )}
            </>
          ) : null}
          <p className="text-xs text-muted-foreground">PNG, JPG, or JPEG only (max 600 KB). Appears on the cover page in preview and exports.</p>
        </CardContent>
      </Card>

      {research && (
        <Card><CardHeader><CardTitle className="text-base">Client Research</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
          <div><b>Industry:</b> {research.industry}</div><div><b>HQ:</b> {research.hq}</div><div><b>Size:</b> {research.size}</div>
          <p className="pt-2">{research.summary}</p>
        </CardContent></Card>
      )}

      <Card><CardHeader className="flex flex-row justify-between items-center"><CardTitle className="text-base">Executive Summary</CardTitle>{editable && !editingSummary && <Button size="sm" variant="ghost" onClick={() => setEditingSummary(true)}>Edit</Button>}</CardHeader><CardContent>
        {editingSummary ? <>
          <RichTextEditor className="min-h-[200px]" value={summary} onChange={setSummary} />
          <div className="flex gap-2 mt-2"><Button size="sm" onClick={saveSummary}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setEditingSummary(false); setSummary(p.executive_summary ?? ""); }}>Cancel</Button></div>
        </> : (p.executive_summary?.trim()
          ? <ProposalRichText content={p.executive_summary} className="text-sm" />
          : <p className="text-sm text-muted-foreground">—</p>)}
      </CardContent></Card>

      {commercials && (
        <Card><CardHeader><CardTitle className="text-base">Commercials</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
          {(commercials.line_items ?? []).map((li: any, i: number) => <div key={i} className="flex justify-between"><span>{li.description} × {li.qty}</span><span>₹ {lineItemAmount(li).toLocaleString("en-IN")}</span></div>)}
          <div className="border-t pt-1 mt-1 flex justify-between"><span>Subtotal</span><span>₹ {commercials.subtotal?.toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between"><span>GST {commercials.gst_percent}%</span><span>₹ {commercials.gst_amount?.toLocaleString("en-IN")}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>₹ {commercials.total?.toLocaleString("en-IN")}</span></div>
        </CardContent></Card>
      )}

      {((p.payment_milestones as any) ?? []).length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Milestones</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
          {(p.payment_milestones as any[]).map((m, i) => <div key={i} className="flex justify-between"><span>{m.label}</span><span>{m.percent}%</span></div>)}
        </CardContent></Card>
      )}
    </div>
  );
}
