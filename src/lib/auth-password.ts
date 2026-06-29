import type { User } from "@supabase/supabase-js";
import type { AppProfile } from "./auth-session";
import {
  bridgePkceVerifierToLocalStorage,
  clearPkceVerifierBridge,
} from "./auth-pkce-bridge";
import {
  RESET_LINK_VERIFY_TIMEOUT_MS,
  beginPasswordRecoveryFlow,
  bindAuthSessionToPage,
  isPasswordRecoveryFlow,
} from "./auth-session-policy";

export const MIN_PASSWORD_LENGTH = 8;

export { RESET_LINK_VERIFY_TIMEOUT_MS };

export function isSsoUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === "azure") return true;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("azure")) return true;
  return user.identities?.some((identity) => identity.provider === "azure") === true;
}

export function mustChangePassword(
  user: User | null | undefined,
  profile?: AppProfile | null,
): boolean {
  if (isSsoUser(user)) return false;
  if (profile?.must_change_password === true) return true;
  return user?.user_metadata?.must_change_password === true;
}

/** Absolute app URL (respects Vite `base` for GitHub Pages). */
export function getAppUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return `${base}${normalized}`;
  return `${window.location.origin}${base}${normalized}`;
}

export function validatePasswordPair(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password !== confirm) return "Passwords do not match";
  return null;
}

/** User-facing message for forgot-password / reset-email failures. */
export function formatPasswordResetError(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : err instanceof Error
        ? err.message
        : "";
  const lower = msg.toLowerCase();

  if (/rate limit|too many.*email|email.*limit/i.test(lower)) {
    return "Too many reset emails sent. Please wait about an hour before trying again.";
  }
  if (/redirect|callback url/i.test(lower)) {
    return "Password reset is not configured for this app. Contact your administrator.";
  }
  if (/invalid.*email|valid email/i.test(lower)) {
    return "Enter a valid email address.";
  }
  if (msg) return msg;
  return "Could not send reset email. Please try again later.";
}

export async function requestPasswordReset(email: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const redirectTo = getAppUrl("/auth/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
  bridgePkceVerifierToLocalStorage();
}

export async function updatePassword(newPassword: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { must_change_password: false },
  });
  if (error) throw error;
  await supabase.rpc("clear_must_change_password");
  await supabase.auth.refreshSession();
  return data;
}

function activateRecoverySession(): true {
  beginPasswordRecoveryFlow();
  bindAuthSessionToPage();
  clearPkceVerifierBridge();
  return true;
}

function hasRecoveryHash(): boolean {
  if (!window.location.hash.startsWith("#")) return false;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return hash.get("type") === "recovery" && Boolean(hash.get("access_token"));
}

function paramsHasRecoveryCode(): boolean {
  return new URLSearchParams(window.location.search).has("code");
}

function clearRecoveryHashFromUrl(): void {
  if (!hasRecoveryHash()) return;
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
}

/** Parse recovery link (PKCE code, token hash, or hash tokens) and establish a session. */
export async function establishPasswordRecoverySession(): Promise<boolean> {
  const { supabase } = await import("@/integrations/supabase/client");

  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const queryType = params.get("type");

  if (tokenHash && queryType === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) throw error;
    window.history.replaceState({}, document.title, window.location.pathname);
    return activateRecoverySession();
  }

  if (hasRecoveryHash()) {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) {
        clearRecoveryHashFromUrl();
        return activateRecoverySession();
      }
    }
    return false;
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState({}, document.title, window.location.pathname);
    return activateRecoverySession();
  }

  const { data } = await supabase.auth.getSession();
  if (data.session && isPasswordRecoveryFlow()) return true;
  return false;
}

/** Wait up to `timeoutMs` for a recovery session from the email link. */
export async function waitForPasswordRecoverySession(
  timeoutMs = RESET_LINK_VERIFY_TIMEOUT_MS,
): Promise<boolean> {
  const { supabase } = await import("@/integrations/supabase/client");

  try {
    if (await establishPasswordRecoverySession()) return true;
  } catch {
    // URL may still be processing — keep polling below.
  }

  return new Promise((resolve) => {
    let settled = false;
    let intervalId = 0;
    let timerId = 0;
    let subscription: { unsubscribe: () => void } | undefined;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      subscription?.unsubscribe();
      if (intervalId) window.clearInterval(intervalId);
      if (timerId) window.clearTimeout(timerId);
      resolve(ok);
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const fromRecoveryUrl = hasRecoveryHash() || paramsHasRecoveryCode();
      if (
        session &&
        (event === "PASSWORD_RECOVERY" ||
          ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && fromRecoveryUrl))
      ) {
        clearRecoveryHashFromUrl();
        activateRecoverySession();
        finish(true);
      }
    });
    subscription = data.subscription;

    const poll = async () => {
      if (settled) return;
      try {
        if (await establishPasswordRecoverySession()) {
          finish(true);
        }
      } catch {
        // keep polling until timeout
      }
    };

    void poll();
    intervalId = window.setInterval(() => void poll(), 500);
    timerId = window.setTimeout(() => finish(false), timeoutMs);
  });
}
