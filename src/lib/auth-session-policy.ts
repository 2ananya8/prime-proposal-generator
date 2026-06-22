/** Max signed-in duration before forced logout. */
export const AUTH_SESSION_MAX_MS = 12 * 60 * 60 * 1000;

const PAGE_ID_KEY = "prime_auth_page_id";
const STARTED_AT_KEY = "prime_auth_started_at";
const RECOVERY_FLOW_KEY = "prime_auth_recovery_flow";

/** How long the reset-password page waits for the email link to verify. */
export const RESET_LINK_VERIFY_TIMEOUT_MS = 60_000;

/** Unique per full page load (refresh generates a new id). */
export const PAGE_INSTANCE_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function ss(): Storage | null {
  return typeof window !== "undefined" ? window.sessionStorage : null;
}

/** Call after a successful login. */
export function bindAuthSessionToPage() {
  const storage = ss();
  if (!storage) return;
  storage.setItem(PAGE_ID_KEY, PAGE_INSTANCE_ID);
  storage.setItem(STARTED_AT_KEY, String(Date.now()));
}

export function clearAuthSessionMeta() {
  const storage = ss();
  if (!storage) return;
  storage.removeItem(PAGE_ID_KEY);
  storage.removeItem(STARTED_AT_KEY);
  storage.removeItem(RECOVERY_FLOW_KEY);
}

/** Active while completing a password reset from an email link. */
export function beginPasswordRecoveryFlow() {
  const storage = ss();
  if (!storage) return;
  storage.setItem(RECOVERY_FLOW_KEY, "1");
}

export function endPasswordRecoveryFlow() {
  ss()?.removeItem(RECOVERY_FLOW_KEY);
}

export function isPasswordRecoveryFlow(): boolean {
  return ss()?.getItem(RECOVERY_FLOW_KEY) === "1";
}

export function isPasswordResetPath(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.endsWith("/auth/reset-password");
}

function sessionStartedAt(): number | null {
  const raw = ss()?.getItem(STARTED_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isBoundToCurrentPage(): boolean {
  return ss()?.getItem(PAGE_ID_KEY) === PAGE_INSTANCE_ID;
}

function isWithinMaxDuration(): boolean {
  const started = sessionStartedAt();
  if (started == null) return false;
  return Date.now() - started <= AUTH_SESSION_MAX_MS;
}

export type AuthSessionPolicyFailure =
  | "refresh"
  | "expired"
  | "unbound";

/** Returns null when the session may continue, otherwise why it must end. */
export function getAuthSessionPolicyFailure(hasSession: boolean): AuthSessionPolicyFailure | null {
  if (!hasSession) return null;
  // Recovery sessions from email links are not bound until we activate them on the reset page.
  if (isPasswordRecoveryFlow() || isPasswordResetPath()) return null;
  if (!isBoundToCurrentPage()) return "refresh";
  if (!isWithinMaxDuration()) return "expired";
  return null;
}

/** Remove legacy Supabase auth tokens from localStorage (pre-sessionStorage migration). */
export function clearLegacyPersistedAuth() {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(localStorage)) {
    if (/^sb-.*-auth-token/.test(key)) {
      localStorage.removeItem(key);
    }
  }
}

export function msUntilAuthExpiry(): number | null {
  const started = sessionStartedAt();
  if (started == null) return null;
  return Math.max(0, AUTH_SESSION_MAX_MS - (Date.now() - started));
}
