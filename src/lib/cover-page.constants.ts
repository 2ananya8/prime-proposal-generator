import {
  DOCX_INCH,
  PDF_INCH,
  PRIME_LOGO_HEIGHT_INCH,
  PRIME_LOGO_WIDTH_INCH,
  SCREEN_DPI,
} from "./proposal-header-footer.constants";

/** Inset from the physical top edge of the cover page to the Prime logo. */
export const COVER_PRIME_LOGO_TOP_INCH = 1.5;
/** Cover-page Prime logo is larger than the in-document header logo. */
export const COVER_PRIME_LOGO_WIDTH_INCH = 2.9;
export const COVER_PRIME_LOGO_HEIGHT_INCH =
  COVER_PRIME_LOGO_WIDTH_INCH * (PRIME_LOGO_HEIGHT_INCH / PRIME_LOGO_WIDTH_INCH);

export const COVER_PRIME_LOGO_WIDTH_PX = Math.round(COVER_PRIME_LOGO_WIDTH_INCH * SCREEN_DPI);
export const COVER_PRIME_LOGO_HEIGHT_PX = Math.round(COVER_PRIME_LOGO_HEIGHT_INCH * SCREEN_DPI);
export const COVER_PRIME_LOGO_TOP_TWIPS = Math.round(COVER_PRIME_LOGO_TOP_INCH * DOCX_INCH);
export const COVER_PRIME_LOGO_WIDTH_PT = COVER_PRIME_LOGO_WIDTH_INCH * PDF_INCH;
export const COVER_PRIME_LOGO_TOP_PT = COVER_PRIME_LOGO_TOP_INCH * PDF_INCH;

/** Cover illustration display height (DOCX / screen). */
export const COVER_ILLUSTRATION_HEIGHT_PX = 235;
/** Cover illustration display height in PDF points. */
export const COVER_ILLUSTRATION_HEIGHT_PT = 165;
