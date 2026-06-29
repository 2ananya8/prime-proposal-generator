const CLIENT_NAME_TOKEN_RE = /\{\{\s*client_name\s*\}\}/gi;

export const TWO_PAGE_LETTER_TEMPLATE = "This is the letter for {{client_name}}. To be filled...";

export function buildTwoPageLetter(clientName: string): string {
  return TWO_PAGE_LETTER_TEMPLATE.replace(CLIENT_NAME_TOKEN_RE, clientName.trim());
}
