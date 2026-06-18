import type { ProposalPreviewData } from "@/lib/proposal-preview";
import { formatCoverDate } from "@/lib/proposal-document-content";
import { ProposalImage } from "@/components/ProposalImage";
import { PROPOSAL_FONT_STACK } from "@/lib/proposal-fonts.constants";
import {
  COVER_ILLUSTRATION_HEIGHT_PX,
  COVER_PRIME_LOGO_HEIGHT_INCH,
  COVER_PRIME_LOGO_TOP_INCH,
  COVER_PRIME_LOGO_WIDTH_INCH,
} from "@/lib/cover-page.constants";

const BRAND = "#1F4E79";

export function ProposalCoverPage({ data }: { data: ProposalPreviewData }) {
  const formattedDate = formatCoverDate(data.proposalDate);

  return (
    <section
      className="proposal-cover-page relative flex flex-col min-h-[1056px] border border-gray-900 bg-white print:break-after-page"
      style={{ fontFamily: PROPOSAL_FONT_STACK }}
    >
      <div
        className="flex justify-center px-10 pb-6"
        style={{ paddingTop: `${COVER_PRIME_LOGO_TOP_INCH}in` }}
      >
        <ProposalImage
          src="/assets/prime-logo.png"
          alt="Prime Infoserv logo"
          className="object-contain"
          style={{ width: `${COVER_PRIME_LOGO_WIDTH_INCH}in`, height: `${COVER_PRIME_LOGO_HEIGHT_INCH}in` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Business Proposal</h1>
        <p className="text-lg font-semibold text-gray-800 max-w-xl leading-snug">{data.service.name}</p>
        <p className="text-base text-gray-700">{formattedDate}</p>

        <ProposalImage
          src="/assets/cover-illustration.png"
          alt="Proposal cover illustration"
          className="mt-4 w-auto max-w-full object-contain"
          style={{ height: `${COVER_ILLUSTRATION_HEIGHT_PX}px` }}
        />
      </div>

      <div className="px-10 pb-10 flex flex-col items-center gap-2">
        {data.clientLogo ? (
          <ProposalImage
            src={data.clientLogo}
            alt={`${data.clientName} logo`}
            className="h-16 max-w-xs object-contain"
          />
        ) : (
          <p className="text-xl font-bold" style={{ color: BRAND }}>{data.clientName}</p>
        )}
      </div>
    </section>
  );
}
