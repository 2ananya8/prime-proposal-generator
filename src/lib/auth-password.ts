import type { User } from "@supabase/supabase-js";

export const MIN_PASSWORD_LENGTH = 8;

export function mustChangePassword(user: User | null | undefined): boolean {
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

export async function requestPasswordReset(email: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const redirectTo = getAppUrl("/auth/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { must_change_password: false },
  });
  if (error) throw error;
  return data;
}

/** Parse recovery link (PKCE code or hash tokens) and establish a session. */
export async function establishPasswordRecoverySession(): Promise<boolean> {
  const { supabase } = await import("@/integrations/supabase/client");

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  // Implicit/hash flow fallback (older email templates).
  const hash = window.location.hash.startsWith("#")
    ? new URLSearchParams(window.location.hash.slice(1))
    : null;
  if (hash?.get("access_token") && hash.get("type") === "recovery") {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return Boolean(data.session);
  }

  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}
