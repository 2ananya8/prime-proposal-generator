import type { ProposalPreviewData } from "./proposal-preview";
import { preloadCoverAssets } from "./cover-page-assets";

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
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
