import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { lineItemAmount, normalizeCommercialLineItems, commercialsSubtotal, type CommercialLineItem } from "@/lib/commercials-line-item";
import { deleteProposal, getProposal, updateProposal } from "@/lib/data-api";
import { buildProposalPreview } from "@/lib/proposal-preview";
import { generateProposalFilesLocally } from "@/lib/generate-proposal-files";
import { useAuth } from "@/lib/auth";
import { canEditProposal } from "@/lib/permissions";
import { authRequired } from "@/lib/auth-session";
import { buildTwoPageLetter } from "@/lib/two-page-proposal";
import { CommercialsLineItemsEditor } from "@/components/CommercialsLineItemsEditor";
import { ProposalRichText } from "@/components/ProposalRichText";

export const Route = createFileRoute("/_authenticated/two-page-proposals/$id")({
  component: TwoPageProposalDetail,
});

function TwoPageProposalDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const auth = useAuth();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = useQuery({ queryKey: ["proposal", id], queryFn: () => getProposal(id) });
  const p = q.data;
  const editable = !!p && (!authRequired() || canEditProposal(auth.profile, auth.user?.id, p));

  const commercialsRaw = useMemo(() => (p?.commercials as any) ?? {}, [p]);
  const initialItems = useMemo(() => normalizeCommercialLineItems(commercialsRaw).line_items as CommercialLineItem[], [commercialsRaw]);
  const [clientName, setClientName] = useState("");
  const [lineItems, setLineItems] = useState<CommercialLineItem[]>([]);
  const [gst, setGst] = useState(18);
  const [commNotes, setCommNotes] = useState("");

  useEffect(() => {
    if (!p) return;
    setClientName(p.client_name);
    setLineItems(initialItems);
    setGst(Number(commercialsRaw.gst_percent ?? 18));
    setCommNotes(String(commercialsRaw.notes ?? ""));
  }, [p, initialItems, commercialsRaw.gst_percent, commercialsRaw.notes]);

  const lineItemsCalc = useMemo(() => normalizeCommercialLineItems(lineItems), [lineItems]);
  const subtotal = useMemo(() => commercialsSubtotal(lineItemsCalc), [lineItemsCalc]);
  const gstAmount = (subtotal * gst) / 100;
  const total = subtotal + gstAmount;
  const letter = buildTwoPageLetter(clientName || "{{client_name}}");

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

  const save = async () => {
    if (!editable || !p) return;
    if (!clientName.trim()) return toast.error("Client name required");
    setSaving(true);
    try {
      await updateProposal(id, {
        client_name: clientName.trim(),
        executive_summary: buildTwoPageLetter(clientName.trim()),
        commercials: { line_items: lineItemsCalc, gst_percent: gst, subtotal, gst_amount: gstAmount, total, notes: commNotes },
      });
      toast.success("Saved");
      await q.refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!p) return;
    const preview = buildProposalPreview({
      ...p,
      client_name: clientName.trim() || p.client_name,
      executive_summary: buildTwoPageLetter(clientName.trim() || p.client_name),
      commercials: { line_items: lineItemsCalc, gst_percent: gst, subtotal, gst_amount: gstAmount, total, notes: commNotes },
      proposal_type: "two_page",
    });
    if (!preview) return toast.error("Cannot build proposal");
    setGenerating(true);
    try {
      const { docxBase64, pdfBase64 } = await generateProposalFilesLocally(preview);
      const safeClient = (clientName || p.client_name).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const base = `${safeClient}-two-page-proposal`;
      triggerDownload(docxBase64, `${base}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      triggerDownload(pdfBase64, `${base}.pdf`, "application/pdf");
      toast.success("DOCX and PDF downloaded");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this proposal?")) return;
    try {
      await deleteProposal(id);
      nav({ to: "/two-page-proposals" });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  if (q.isLoading) return <p>Loading…</p>;
  if (!p) return <p>Not found.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/two-page-proposals" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" />Back
      </Link>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{clientName || p.client_name}</h1>
          <p className="text-sm text-muted-foreground">2-page proposal · {p.proposal_date}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link to="/two-page-proposals/$id/preview" params={{ id }}>
            <Button variant="outline"><Eye className="h-4 w-4 mr-1" />Preview</Button>
          </Link>
          <Button onClick={generate} disabled={generating}>
            {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating</> : <><Sparkles className="h-4 w-4 mr-1" />Generate DOCX/PDF</>}
          </Button>
          {editable ? (
            <Button variant="ghost" size="icon" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Client Name</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={!editable} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Letter (template)</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border p-3">
            <ProposalRichText content={letter} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Commercials</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <CommercialsLineItemsEditor lineItems={lineItems} onChange={setLineItems} />
          <div className="flex items-center gap-3">
            <Label>GST %</Label>
            <Input className="w-24" type="number" value={gst} onChange={(e) => setGst(Number(e.target.value))} disabled={!editable} />
          </div>
          <div className="text-sm space-y-1 border-t pt-2">
            {(lineItemsCalc ?? []).map((li, i) => (
              <div className="flex justify-between" key={i}>
                <span>{li.description} × {li.qty}</span>
                <span>₹ {lineItemAmount(li).toLocaleString("en-IN")}</span>
              </div>
            ))}
            <div className="flex justify-between"><span>Subtotal</span><span>₹ {subtotal.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>GST</span><span>₹ {gstAmount.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>₹ {total.toLocaleString("en-IN")}</span></div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <RichTextEditor value={commNotes} onChange={setCommNotes} />
          </div>
        </CardContent>
      </Card>

      {editable ? (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      ) : null}
    </div>
  );
}
