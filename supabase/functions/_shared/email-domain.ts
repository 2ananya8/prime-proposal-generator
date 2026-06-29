export const PRIME_INFOSERV_EMAIL_DOMAIN = "primeinfoserv.com";

export function isPrimeInfoservEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 0) return false;
  return normalized.slice(at + 1) === PRIME_INFOSERV_EMAIL_DOMAIN;
}

export const ADMIN_CREATE_PRIME_EMAIL_ERROR =
  "Prime Infoserv employees (@primeinfoserv.com) must sign in with Microsoft SSO. Use this form only for external collaborators.";
