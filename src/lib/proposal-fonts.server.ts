import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-400-normal.ttf",
  bold: "https://cdn.jsdelivr.net/fontsource/fonts/poppins@latest/latin-700-normal.ttf",
};

let cachedRegular: Uint8Array | null = null;
let cachedBold: Uint8Array | null = null;

function tryReadLocalFont(...names: string[]): Uint8Array | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "public", "assets", "fonts"),
    path.resolve(moduleDir, "../../../public/assets/fonts"),
    path.resolve(moduleDir, "../../public/assets/fonts"),
  ];
  for (const dir of candidates) {
    for (const name of names) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return fs.readFileSync(full);
    }
  }
  return null;
}

async function loadFontBytes(kind: "regular" | "bold"): Promise<Uint8Array> {
  const cache = kind === "regular" ? cachedRegular : cachedBold;
  if (cache) return cache;

  const local = tryReadLocalFont(
    kind === "regular" ? "poppins-regular.ttf" : "poppins-bold.ttf",
  );
  if (local) {
    if (kind === "regular") cachedRegular = local;
    else cachedBold = local;
    return local;
  }

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
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes("regular"),
    loadFontBytes("bold"),
  ]);
  return {
    font: await pdf.embedFont(regularBytes),
    bold: await pdf.embedFont(boldBytes),
  };
}
