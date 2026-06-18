import { ProposalImage } from "@/components/ProposalImage";
import { ENDING_COMPANY_NAME, ENDING_CONTACT_LINES } from "@/lib/proposal-ending-page";

export function ProposalEndingPage() {
  return (
    <div className="proposal-ending-body flex min-h-[720px] flex-col items-center justify-center py-8 text-center">
      <ProposalImage
        src="/assets/contact-us.png"
        alt="Contact us"
        className="mb-10 w-full max-w-[460px] object-contain"
      />

      <p className="text-[28px] font-bold text-[#1F4E79] leading-tight">{ENDING_COMPANY_NAME}</p>
      <div className="mt-4 max-w-[680px] space-y-2 text-[18px] leading-snug text-gray-800">
        {ENDING_CONTACT_LINES.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <ProposalImage
        src="/assets/prime-logo.png"
        alt="Prime Infoserv logo"
        className="mt-10 h-16 object-contain"
      />
    </div>
  );
}
