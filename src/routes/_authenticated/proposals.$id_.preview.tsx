import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProposalPreview } from "@/components/ProposalPreview";
import { buildProposalPreview } from "@/lib/proposal-preview";
import { BODY_TOP_MARGIN_TWIPS, DOCX_INCH, WATERMARK_OPACITY } from "@/lib/proposal-header-footer.constants";
import { getProposal } from "@/lib/data-api";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/proposals/$id_/preview")({
  head: ({ params }) => ({ meta: [{ title: `Preview — Proposal ${params.id.slice(0, 8)}` }] }),
  component: ProposalPreviewPage,
});

function ProposalPreviewPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["proposal", id], queryFn: () => getProposal(id) });
  const preview = q.data ? buildProposalPreview(q.data) : null;

  if (q.isLoading) return <p className="p-6">Loading preview…</p>;
  if (!preview) return (
    <div className="p-6 space-y-3">
      <p>Cannot preview — link a service to this proposal first.</p>
      <Link to="/proposals/$id" params={{ id }} className="text-sm text-primary underline">Back to proposal</Link>
    </div>
  );

  return (
    <div className="proposal-preview-page min-h-screen bg-[#eef4f8]">
      <div className="proposal-preview-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/95 backdrop-blur px-6 py-3 print:hidden">
        <Link to="/proposals/$id" params={{ id }} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" />Back to proposal
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />Print / Save PDF
        </Button>
      </div>
      <div className="max-w-[816px] mx-auto px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <ProposalPreview data={preview} />
      </div>
      <style>{`
        @media print {
          aside, .proposal-preview-toolbar { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .proposal-preview-page { background: white !important; }
          .proposal-page-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: white;
            z-index: 10;
          }
          .proposal-page-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            height: auto;
            z-index: 0;
            opacity: ${WATERMARK_OPACITY};
          }
          .proposal-page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            z-index: 10;
          }
          .proposal-page-footer img {
            width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 !important;
          }
          .proposal-content-body {
            margin-top: ${BODY_TOP_MARGIN_TWIPS / DOCX_INCH}in;
            margin-bottom: 1.2in;
          }
          .break-before-page {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
