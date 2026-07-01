import type { ProposalPreviewData } from "./proposal-preview";
import { preloadCoverAssets } from "./cover-page-assets";

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let bin = "";
    for (let j = 0; j < chunk.length; j++) bin += String.fromCharCode(chunk[j]!);
    chunks.push(bin);
  }
  return btoa(chunks.join(""));
}

/** Generate DOCX/PDF in the browser (GitHub Pages and local dev). */
export async function generateProposalFilesLocally(data: ProposalPreviewData) {
  await preloadCoverAssets();

  const [{ generateProposalDocx }, { generateProposalPdf }] = await Promise.all([
    import("./generate-docx"),
    import("./generate-pdf"),
  ]);

  const [docxBuf, pdfBuf] = await Promise.all([
    generateProposalDocx(data),
    generateProposalPdf(data),
  ]);

  return {
    docxBase64: uint8ToBase64(docxBuf),
    pdfBase64: uint8ToBase64(pdfBuf),
  };
}
