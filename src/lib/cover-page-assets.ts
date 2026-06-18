import { publicAsset } from "./public-asset";

export type ParsedImage = { buffer: Uint8Array; type: "png" | "jpg"; alt: string };

type DiskLoader = (names: string[]) => Uint8Array | null;

const assetCache = new Map<string, ParsedImage>();
let diskLoader: DiskLoader | null = null;
let preloadPromise: Promise<void> | null = null;

export function registerCoverAssetDiskLoader(loader: DiskLoader) {
  diskLoader = loader;
}

const ASSET_MANIFEST: Array<{ key: string; names: string[]; alt: string }> = [
  { key: "prime-logo", names: ["prime-logo.png", "prime-logo.jpg", "prime-logo.jpeg"], alt: "Prime Infoserv logo" },
  { key: "iso-27001", names: ["iso-27001.png", "iso-27001.jpg"], alt: "ISO 27001 certification" },
  { key: "iso-9001", names: ["iso-9001.png", "iso-9001.jpg"], alt: "ISO 9001:2015 certification" },
  { key: "cover-illustration", names: ["cover-illustration.png", "cover-illustration.jpg"], alt: "Proposal cover illustration" },
  { key: "contact-us", names: ["contact-us.png", "contact-us.jpg"], alt: "Contact us illustration" },
  {
    key: "proposal-footer",
    names: ["proposal-footer.png", "proposal-footer.jpg", "proposal-footer.jpeg"],
    alt: "Prime Infoserv footer banner with company logo, contact information, and security graphic",
  },
  { key: "watermark", names: ["watermark.png", "watermark.jpg"], alt: "Prime Infoserv watermark" },
  {
    key: "image-unavailable",
    names: ["image-unavailable.png", "image-unavailable.jpg"],
    alt: "Unable to load image",
  },
];

function readUInt32BE(buffer: Uint8Array, offset: number): number {
  return (
    (buffer[offset]! << 24) |
    (buffer[offset + 1]! << 16) |
    (buffer[offset + 2]! << 8) |
    buffer[offset + 3]!
  );
}

function readUInt16BE(buffer: Uint8Array, offset: number): number {
  return (buffer[offset]! << 8) | buffer[offset + 1]!;
}

export function detectImageType(buffer: Uint8Array): "png" | "jpg" {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "jpg";
  }
  return "png";
}

async function fetchAssetBytes(names: string[]): Promise<Uint8Array | null> {
  if (diskLoader) {
    const fromDisk = diskLoader(names);
    if (fromDisk) return fromDisk;
  }
  for (const name of names) {
    try {
      const response = await fetch(publicAsset(`/assets/${name}`));
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
    } catch {
      // try next name
    }
  }
  return null;
}

async function cacheAsset(key: string, names: string[], alt: string) {
  const bytes = await fetchAssetBytes(names);
  if (!bytes) return;
  assetCache.set(key, { buffer: bytes, type: detectImageType(bytes), alt });
}

export async function preloadCoverAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    await Promise.all(ASSET_MANIFEST.map(({ key, names, alt }) => cacheAsset(key, names, alt)));
    if (!assetCache.has("image-unavailable") && !assetCache.has("prime-logo")) {
      throw new Error("Could not load proposal image assets from /assets");
    }
  })();
  return preloadPromise;
}

function cached(key: string, fallbackKey: string, alt: string): ParsedImage {
  const hit = assetCache.get(key) ?? assetCache.get(fallbackKey);
  if (hit) return hit;
  const placeholder = assetCache.get("image-unavailable") ?? assetCache.get("prime-logo");
  if (placeholder) return { ...placeholder, alt };
  throw new Error(`Cover asset "${key}" is not loaded — call preloadCoverAssets() first`);
}

export function placeholderImage(alt: string): ParsedImage {
  return cached("image-unavailable", "prime-logo", alt);
}

export function loadCoverAsset(names: string[], alt: string): ParsedImage {
  for (const name of names) {
    const key = name.replace(/\.(png|jpe?g)$/i, "");
    const hit = assetCache.get(key);
    if (hit) return { ...hit, alt };
  }
  return placeholderImage(alt);
}

export function loadPrimeLogo(): ParsedImage {
  return cached("prime-logo", "image-unavailable", "Prime Infoserv logo");
}

export function loadIso27001Logo(): ParsedImage {
  return cached("iso-27001", "image-unavailable", "ISO 27001 certification");
}

export function loadIso9001Logo(): ParsedImage {
  return cached("iso-9001", "image-unavailable", "ISO 9001:2015 certification");
}

export function loadCoverIllustration(): ParsedImage {
  return cached("cover-illustration", "image-unavailable", "Proposal cover illustration");
}

export function getCoverIllustrationDisplaySize(targetHeight: number): { width: number; height: number } {
  const img = loadCoverIllustration();
  const dims = getImageDimensions(img.buffer);
  return scaleToHeight(dims.width, dims.height, targetHeight);
}

export function loadContactUsIllustration(): ParsedImage {
  return cached("contact-us", "image-unavailable", "Contact us illustration");
}

export function loadProposalFooter(): ParsedImage {
  return cached("proposal-footer", "image-unavailable", "Prime Infoserv footer banner");
}

export function loadWatermark(): ParsedImage {
  return cached("watermark", "image-unavailable", "Prime Infoserv watermark");
}

export function loadImageUnavailableAsset(): ParsedImage {
  return cached("image-unavailable", "prime-logo", "Unable to load image");
}

export function parseImageDataUrl(dataUrl: string | null | undefined, alt: string): ParsedImage | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match?.[2]) return null;
  try {
    const binary = atob(match[2]);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return { buffer, type: detectImageType(buffer), alt };
  } catch {
    return null;
  }
}

export async function embedPdfImage(pdf: import("pdf-lib").PDFDocument, img: ParsedImage) {
  return img.type === "jpg" ? pdf.embedJpg(img.buffer) : pdf.embedPng(img.buffer);
}

export function getImageDimensions(buffer: Uint8Array): { width: number; height: number } {
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: readUInt32BE(buffer, 16), height: readUInt32BE(buffer, 20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length - 8) {
      if (buffer[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buffer[i + 1];
      if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1) {
        return { height: readUInt16BE(buffer, i + 5), width: readUInt16BE(buffer, i + 7) };
      }
      const len = readUInt16BE(buffer, i + 2);
      i += 2 + len;
    }
  }
  return { width: 200, height: 80 };
}

export function scaleToHeight(
  width: number,
  height: number,
  targetHeight: number,
): { width: number; height: number } {
  const scale = targetHeight / height;
  return { width: Math.round(width * scale), height: Math.round(targetHeight) };
}

export function scaleToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: Math.round(maxWidth), height: Math.round(maxHeight) };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
