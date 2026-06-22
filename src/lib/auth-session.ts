import { hasSupabaseConfig, isLocalStorageMode } from "./app-config";

export type AppProfile = {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
};

async function getSupabase() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

export async function getAuthSession() {
  if (isLocalStorageMode() || !hasSupabaseConfig()) return null;
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppProfile;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function authRequired(): boolean {
  return hasSupabaseConfig() && !isLocalStorageMode();
}
