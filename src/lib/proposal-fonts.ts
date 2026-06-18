import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.ttf",
  bold: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf",
};

let cachedRegular: Uint8Array | null = null;
let cachedBold: Uint8Array | null = null;

async function loadFontBytes(kind: "regular" | "bold"): Promise<Uint8Array> {
  const cache = kind === "regular" ? cachedRegular : cachedBold;
  if (cache) return cache;

  const response = await fetch(FONT_URLS[kind]);
  if (!response.ok) {
    throw new Error(`Failed to load Poppins ${kind} font (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (kind === "regular") cachedRegular = bytes;
  else cachedBold = bytes;
  return bytes;
}

export async function embedProposalPdfFonts(pdf: PDFDocument): Promise<{ font: PDFFont; bold: PDFFont }> {
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([loadFontBytes("regular"), loadFontBytes("bold")]);
  return {
    font: await pdf.embedFont(regularBytes),
    bold: await pdf.embedFont(boldBytes),
  };
}
