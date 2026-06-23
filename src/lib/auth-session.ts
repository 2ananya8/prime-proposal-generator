import { hasSupabaseConfig, isLocalStorageMode } from "./app-config";
import {
  bindAuthSessionToPage,
  clearAuthSessionMeta,
  clearLegacyPersistedAuth,
  getAuthSessionPolicyFailure,
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

export async function signInWithPassword(email: string, password: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  bindAuthSessionToPage();
  return data;
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
