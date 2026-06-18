import type { ProposalPreviewData } from "./proposal-preview";
import {
  loadPrimeLogo,
  loadProposalFooter,
  loadWatermark,
  parseImageDataUrl,
  placeholderImage,
  type ParsedImage,
} from "./cover-page-assets";
import { clientLogoAlt } from "./proposal-header-footer.constants";

export function resolveClientLogo(
  clientLogo: string | null | undefined,
  clientName: string,
): ParsedImage {
  if (clientLogo) {
    const parsed = parseImageDataUrl(clientLogo, clientLogoAlt(clientName));
    if (parsed) return parsed;
  }
  return placeholderImage(clientLogoAlt(clientName));
}

export function getProposalHeaderImages(data: ProposalPreviewData) {
  return {
    prime: loadPrimeLogo(),
    client: resolveClientLogo(data.clientLogo, data.clientName),
  };
}

export function getProposalFooterImage(): ParsedImage {
  return loadProposalFooter();
}

export function getProposalWatermarkImage(): ParsedImage {
  return loadWatermark();
}
