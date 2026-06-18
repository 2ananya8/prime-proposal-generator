import type { ProposalPreviewData } from "@/lib/proposal-preview";
import { ProposalImage } from "@/components/ProposalImage";
import {
  clientLogoAlt,
  FOOTER_BANNER_ALT,
  HEADER_LINE_AFTER_INCH,
  HEADER_LINE_GAP_INCH,
  HEADER_LOGO_SIDE_PAD_INCH,
  HEADER_LOGO_TOP_INCH,
  PRIME_LOGO_ALT,
  PRIME_LOGO_HEIGHT_INCH,
  PRIME_LOGO_WIDTH_INCH,
  CLIENT_LOGO_MAX_INCH,
  WATERMARK_MAX_WIDTH_FRACTION,
  WATERMARK_OPACITY,
} from "@/lib/proposal-header-footer.constants";
import { publicAsset } from "@/lib/public-asset";

function ImageFallback({ alt, className, style }: { alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 text-center ${className ?? ""}`}
      style={style}
      role="img"
      aria-label={alt}
    >
      <img src={publicAsset("/assets/image-unavailable.svg")} alt="" className="h-8 w-8 opacity-60 mb-1" aria-hidden />
      <span className="text-[10px] uppercase tracking-wide">Unable to load image</span>
      <span className="text-xs font-semibold mt-1 px-2">{alt}</span>
    </div>
  );
}

export function ProposalPageHeader({ data }: { data: ProposalPreviewData }) {
  return (
    <header className="proposal-page-header relative z-[1]" style={{ paddingTop: `${HEADER_LOGO_TOP_INCH}in` }}>
      <div
        className="flex items-start justify-between"
        style={{
          paddingLeft: `${HEADER_LOGO_SIDE_PAD_INCH}in`,
          paddingRight: `${HEADER_LOGO_SIDE_PAD_INCH}in`,
        }}
      >
        <ProposalImage
          src="/assets/prime-logo.png"
          alt={PRIME_LOGO_ALT}
          className="object-contain object-left"
          fallbackClassName="min-w-[120px]"
          style={{ width: `${PRIME_LOGO_WIDTH_INCH}in`, height: `${PRIME_LOGO_HEIGHT_INCH}in` }}
        />
        {data.clientLogo ? (
          <ProposalImage
            src={data.clientLogo}
            alt={clientLogoAlt(data.clientName)}
            className="object-contain object-right"
            fallbackClassName="min-w-[80px]"
            style={{ maxWidth: `${CLIENT_LOGO_MAX_INCH}in`, maxHeight: `${CLIENT_LOGO_MAX_INCH}in` }}
          />
        ) : (
          <ImageFallback
            alt={clientLogoAlt(data.clientName)}
            className="px-2"
            style={{ width: `${CLIENT_LOGO_MAX_INCH}in`, height: `${CLIENT_LOGO_MAX_INCH}in`, minWidth: "80px" }}
          />
        )}
      </div>
      <div
        className="border-b-2"
        style={{
          borderColor: "#1F4E79",
          marginTop: `${HEADER_LINE_GAP_INCH}in`,
          marginBottom: `${HEADER_LINE_AFTER_INCH}in`,
        }}
      />
    </header>
  );
}

export function ProposalPageFooter() {
  return (
    <footer className="proposal-page-footer relative z-[1] block w-[calc(100%+2rem)] -mx-4 max-w-none m-0 p-0">
      <ProposalImage
        src="/assets/proposal-footer.png"
        alt={FOOTER_BANNER_ALT}
        className="w-full h-auto block m-0 p-0"
        fallbackClassName="w-full min-h-[52px]"
      />
    </footer>
  );
}

export function ProposalPageWatermark() {
  return (
    <img
      src={publicAsset("/assets/watermark.png")}
      alt=""
      aria-hidden
      className="proposal-page-watermark pointer-events-none select-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: `${WATERMARK_MAX_WIDTH_FRACTION * 100}%`,
        opacity: WATERMARK_OPACITY,
      }}
    />
  );
}
