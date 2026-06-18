import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ParsedImage = { buffer: Buffer; type: "png" | "jpg"; alt: string };

let cachedPlaceholderBuffer: Buffer | null = null;

function getPlaceholderBuffer(): Buffer {
  if (cachedPlaceholderBuffer) return cachedPlaceholderBuffer;
  const fromFile = tryReadFile("image-unavailable.jpg", "image-unavailable.png", "prime-logo.png", "prime-logo.jpg");
  if (fromFile) {
    cachedPlaceholderBuffer = fromFile;
    return fromFile;
  }
  throw new Error("No placeholder image found in public/assets");
}

function resolveAssetsDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "public", "assets"),
    path.join(process.cwd(), "proposal-wizard-fixed", "public", "assets"),
    path.resolve(moduleDir, "../../../public/assets"),
    path.resolve(moduleDir, "../../../../public/assets"),
    path.resolve(moduleDir, "../../public/assets"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(`Cover assets folder not found. cwd=${process.cwd()}`);
}

function assetPath(name: string): string {
  return path.join(resolveAssetsDir(), name);
}

export function detectImageType(buffer: Buffer): "png" | "jpg" {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "jpg";
  }
  return "png";
}

function tryReadFile(...names: string[]): Buffer | null {
  for (const name of names) {
    const full = assetPath(name);
    if (fs.existsSync(full)) return fs.readFileSync(full);
  }
  return null;
}

export function placeholderImage(alt: string): ParsedImage {
  const buffer = getPlaceholderBuffer();
  return { buffer, type: detectImageType(buffer), alt };
}

export function loadCoverAsset(
  names: string[],
  alt: string,
): ParsedImage {
  const buffer = tryReadFile(...names);
  if (!buffer) return placeholderImage(alt);
  try {
    return { buffer, type: detectImageType(buffer), alt };
  } catch {
    return placeholderImage(alt);
  }
}

export function loadPrimeLogo(): ParsedImage {
  return loadCoverAsset(["prime-logo.png", "prime-logo.jpg", "prime-logo.jpeg"], "Prime Infoserv logo");
}

export function loadIso27001Logo(): ParsedImage {
  return loadCoverAsset(["iso-27001.png", "iso-27001.jpg"], "ISO 27001 certification");
}

export function loadIso9001Logo(): ParsedImage {
  return loadCoverAsset(["iso-9001.png", "iso-9001.jpg"], "ISO 9001:2015 certification");
}

export function loadCoverIllustration(): ParsedImage {
  return loadCoverAsset(["cover-illustration.png", "cover-illustration.jpg"], "Proposal cover illustration");
}

export function getCoverIllustrationDisplaySize(targetHeight: number): { width: number; height: number } {
  const img = loadCoverIllustration();
  const dims = getImageDimensions(img.buffer);
  return scaleToHeight(dims.width, dims.height, targetHeight);
}

export function loadContactUsIllustration(): ParsedImage {
  return loadCoverAsset(["contact-us.png", "contact-us.jpg"], "Contact us illustration");
}

export function loadProposalFooter(): ParsedImage {
  return loadCoverAsset(
    ["proposal-footer.png", "proposal-footer.jpg", "proposal-footer.jpeg"],
    "Prime Infoserv footer banner with company logo, contact information, and security graphic",
  );
}

export function loadWatermark(): ParsedImage {
  return loadCoverAsset(["watermark.png", "watermark.jpg"], "Prime Infoserv watermark");
}

export function loadImageUnavailableAsset(): ParsedImage {
  return loadCoverAsset(["image-unavailable.png", "image-unavailable.jpg"], "Unable to load image");
}

export function parseImageDataUrl(dataUrl: string | null | undefined, alt: string): ParsedImage | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], "base64");
    return { buffer, type: detectImageType(buffer), alt };
  } catch {
    return null;
  }
}

export async function embedPdfImage(pdf: import("pdf-lib").PDFDocument, img: ParsedImage) {
  return img.type === "jpg" ? pdf.embedJpg(img.buffer) : pdf.embedPng(img.buffer);
}

export function getImageDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let i = 2;
    while (i < buffer.length - 8) {
      if (buffer[i] !== 0xff) { i++; continue; }
      const marker = buffer[i + 1];
      if (marker === 0xc0 || marker === 0xc2 || marker === 0xc1) {
        return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
      }
      const len = buffer.readUInt16BE(i + 2);
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

/** Fit inside a box without changing aspect ratio. */
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
