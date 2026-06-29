import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ProposalRichText } from "@/components/ProposalRichText";
import { CommercialsLineItemsEditor } from "@/components/CommercialsLineItemsEditor";
import { commercialsSubtotal, EMPTY_COMMERCIAL_LINE_ITEM, normalizeCommercialLineItems, type CommercialLineItem } from "@/lib/commercials-line-item";
import { createProposal } from "@/lib/data-api";
import { buildTwoPageLetter } from "@/lib/two-page-proposal";

export const Route = createFileRoute("/_authenticated/two-page-proposals/new")({
  head: () => ({ meta: [{ title: "New 2-page proposal — Prime Infoserv" }] }),
  component: NewTwoPageProposal,
});

function NewTwoPageProposal() {
  const nav = useNavigate();
  const [clientName, setClientName] = useState("");
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState<CommercialLineItem[]>([{ ...EMPTY_COMMERCIAL_LINE_ITEM }]);
  const [gst, setGst] = useState(18);
  const [commNotes, setCommNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const lineItemsCalc = useMemo(() => normalizeCommercialLineItems(lineItems), [lineItems]);
  const subtotal = useMemo(() => commercialsSubtotal(lineItemsCalc), [lineItemsCalc]);
  const gstAmount = (subtotal * gst) / 100;
  const total = subtotal + gstAmount;
  const letter = buildTwoPageLetter(clientName || "{{client_name}}");

  const save = async () => {
    if (!clientName.trim()) return toast.error("Client name required");
    setSaving(true);
    try {
      const data = await createProposal({
        proposal_type: "two_page",
        client_name: clientName.trim(),
        client_logo: null,
        client_website: null,
        service_id: null,
        proposal_date: proposalDate,
        client_research: null,
        executive_summary: buildTwoPageLetter(clientName.trim()),
        scope_details: {},
        timeline_overrides: [],
        commercials: { line_items: lineItemsCalc, gst_percent: gst, subtotal, gst_amount: gstAmount, total, notes: commNotes },
        payment_milestones: [],
        extra_fields: [],
      });
      toast.success("2-page proposal saved");
      nav({ to: "/two-page-proposals/$id", params: { id: data.id } });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/two-page-proposals" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" />Back
      </Link>
      <h1 className="text-2xl font-semibold">New 2-page proposal</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Client Name *</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ACME Corp" />
          </div>
          <div className="space-y-1">
            <Label>Proposal Date</Label>
            <Input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Letter (template)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Only <code>{"{{client_name}}"}</code> is replaced automatically.</p>
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
            <Input className="w-24" type="number" value={gst} onChange={(e) => setGst(Number(e.target.value))} />
          </div>
          <div className="text-sm space-y-1 border-t pt-2">
            <div className="flex justify-between"><span>Subtotal</span><span>₹ {subtotal.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span>GST</span><span>₹ {gstAmount.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>₹ {total.toLocaleString("en-IN")}</span></div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <RichTextEditor value={commNotes} onChange={setCommNotes} placeholder="Optional notes for commercials" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-background py-3 border-t">
        <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save proposal"}</Button>
      </div>
    </div>
  );
}
