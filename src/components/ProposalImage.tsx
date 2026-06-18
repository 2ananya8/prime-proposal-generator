import { useState } from "react";
import { publicAsset } from "@/lib/public-asset";

function resolveAssetSrc(src: string): string {
  if (src.startsWith("/assets/")) return publicAsset(src);
  return src;
}

type Props = {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
};

export function ProposalImage({ src, alt, className = "", fallbackClassName = "", style }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 text-center ${fallbackClassName || className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <img
          src={publicAsset("/assets/image-unavailable.svg")}
          alt=""
          className="h-8 w-8 opacity-60 mb-1"
          aria-hidden
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-[10px] uppercase tracking-wide">Unable to load image</span>
        <span className="text-xs font-semibold mt-1 px-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolveAssetSrc(src)}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
