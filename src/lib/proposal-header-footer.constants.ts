export const PRIME_LOGO_ALT = "Prime Infoserv logo";
export const FOOTER_BANNER_ALT =
  "Prime Infoserv footer banner with company logo, contact information, and security graphic";

export function clientLogoAlt(clientName: string) {
  return `${clientName} logo`;
}

export const DOCX_INCH = 1440;
export const PDF_INCH = 72;
export const SCREEN_DPI = 96;

export const DOCX_PAGE_WIDTH = 12240;
export const DOCX_MARGIN_LR = 1080;

export const PDF_PAGE_W = 595.28;
export const PDF_PAGE_H = 841.89;

/**
 * Header layout derived from reference proposal:
 * Web_Application__Infrastructure_VAPT_Source2T_V1_0.docx
 */
export const HEADER_DISTANCE_TWIPS = 708;
export const BODY_MARGIN_LR_TWIPS = 1440;

export const HEADER_LOGO_TOP_INCH = 0.25;
export const PRIME_LOGO_HEIGHT_INCH = 0.5;
export const PRIME_LOGO_WIDTH_INCH = 1.205;
/** Max width/height box for the client logo; image scales proportionally inside. */
export const CLIENT_LOGO_MAX_INCH = 0.717;
export const HEADER_LINE_GAP_INCH = 0.05;
/** Space between the separator line and body content. */
export const HEADER_LINE_AFTER_INCH = 0.12;

export const BODY_TOP_MARGIN_TWIPS = Math.round(
  (HEADER_LOGO_TOP_INCH +
    Math.max(PRIME_LOGO_HEIGHT_INCH, CLIENT_LOGO_MAX_INCH) +
    HEADER_LINE_GAP_INCH +
    HEADER_LINE_AFTER_INCH +
    0.05) *
    DOCX_INCH,
);
/** Logo inset from the physical page edge. */
export const HEADER_LOGO_SIDE_PAD_INCH = 0.8;
export const HEADER_LOGO_SIDE_PAD_INNER_TWIPS =
  Math.round(HEADER_LOGO_SIDE_PAD_INCH * DOCX_INCH) - DOCX_MARGIN_LR;
/** Separator line inset from the physical page edge (unchanged from reference layout). */
export const HEADER_LINE_SIDE_PAD_INCH = 0.15;

export const PAGE_WIDTH_PX = Math.round(8.5 * SCREEN_DPI);
export const PRIME_LOGO_HEIGHT_PX = Math.round(PRIME_LOGO_HEIGHT_INCH * SCREEN_DPI);
export const PRIME_LOGO_WIDTH_PX = Math.round(PRIME_LOGO_WIDTH_INCH * SCREEN_DPI);
export const CLIENT_LOGO_MAX_PX = Math.round(CLIENT_LOGO_MAX_INCH * SCREEN_DPI);

export const BRAND_HEX = "1F4E79";

export const WATERMARK_ALT = "Prime Infoserv watermark";
/** Fraction of page width used for watermark image sizing (PDF, DOCX, screen). */
export const WATERMARK_MAX_WIDTH_FRACTION = 0.72;
/** Browser preview opacity (image is already light gray). */
export const WATERMARK_OPACITY = 0.2;
/** PDF draws the watermark on top of content; needs higher opacity to stay visible. */
export const PDF_WATERMARK_OPACITY = 0.45;
