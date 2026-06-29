import { hasSupabaseConfig, isLocalStorageMode } from "./app-config";
import {
  bindAuthSessionToPage,
  clearAuthSessionMeta,
  clearLegacyPersistedAuth,
  endOAuthSignInFlow,
  getAuthSessionPolicyFailure,
  beginOAuthSignInFlow,
  isOAuthCallbackPath,
} from "./auth-session-policy";

export type AppProfile = {
  id: string;
  email: string;
  role: "admin" | "user";
  must_change_password: boolean;
  created_at: string;
};

async function getSupabase() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

export async function getAuthSession() {
  if (isLocalStorageMode() || !hasSupabaseConfig()) return null;
  clearLegacyPersistedAuth();
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const failure = getAuthSessionPolicyFailure(Boolean(data.session));
  if (failure) {
    await signOut();
    return null;
  }
  return data.session;
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, must_change_password, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppProfile;
}

/** Profile read can lag immediately after sign-in while the JWT is attached. */
export async function fetchProfileWithRetry(
  userId: string,
  attempts = 5,
): Promise<AppProfile | null> {
  for (let i = 0; i < attempts; i++) {
    const profile = await fetchProfile(userId);
    if (profile) return profile;
    await new Promise((resolve) => window.setTimeout(resolve, 80 * (i + 1)));
  }
  return null;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  bindAuthSessionToPage();
  await supabase.auth.getSession();
  return data;
}

export function isOAuthCallbackUrl(): boolean {
  return isOAuthCallbackPath();
}

function clearOAuthParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, window.location.pathname);
}

/** Complete Microsoft SSO redirect (PKCE code or implicit hash tokens). */
export async function completeOAuthSignInIfNeeded(): Promise<boolean> {
  if (!isOAuthCallbackPath()) return false;

  beginOAuthSignInFlow();
  const supabase = await getSupabase();
  const code = new URLSearchParams(window.location.search).get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    clearOAuthParamsFromUrl();
    bindAuthSessionToPage();
    await supabase.auth.getSession();
    return true;
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) {
      clearOAuthParamsFromUrl();
      bindAuthSessionToPage();
      return true;
    }
  }

  return false;
}

export async function signInWithMicrosoft() {
  const { getAppUrl } = await import("./auth-password");
  beginOAuthSignInFlow();
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: getAppUrl("/auth"),
      scopes: "email openid profile",
    },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.assign(data.url);
  }
  return data;
}

export function completeOAuthSignInSession() {
  bindAuthSessionToPage();
  endOAuthSignInFlow();
}

export async function signOut() {
  const supabase = await getSupabase();
  clearAuthSessionMeta();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function authRequired(): boolean {
  return hasSupabaseConfig() && !isLocalStorageMode();
}
