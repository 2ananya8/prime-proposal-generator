import { createServerFn } from "@tanstack/react-start";
import type { ProposalPreviewData } from "./proposal-preview";

// Accept the full proposal input from the client (localStorage is browser-only
// so the server cannot read it). The client builds the input and we just generate.
export const generateProposalFiles = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input as ProposalPreviewData)
  .handler(async ({ data }) => {
    try {
      await import("./cover-page-assets.server");
      const { preloadCoverAssets } = await import("./cover-page-assets");
      await preloadCoverAssets();
      const { generateProposalDocx } = await import("./generate-docx");
      const { generateProposalPdf } = await import("./generate-pdf");

      const docxBuf = await generateProposalDocx(data);
      const pdfBuf = await generateProposalPdf(data);

      return {
        docxBase64: Buffer.from(docxBuf).toString("base64"),
        pdfBase64: Buffer.from(pdfBuf).toString("base64"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document generation failed";
      console.error("[generateProposalFiles]", error);
      throw new Error(message);
    }
  });
