// Supabase browser client — used when Supabase credentials are configured.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/app-config";
import { restorePkceVerifierFromBridgeIfNeeded } from "@/lib/auth-pkce-bridge";

// Must run before createClient so email reset links (?code=) work in a new tab.
restorePkceVerifierFromBridgeIfNeeded();

function createSupabaseClient() {
  const SUPABASE_URL = getSupabaseUrl();
  const SUPABASE_PUBLISHABLE_KEY = getSupabaseAnonKey();

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null as any;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      // sessionStorage: cleared when the tab closes; refresh handled via page-instance binding.
      storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Implicit flow: recovery emails use URL hash tokens, which work when opened from email in a new tab.
      flowType: "implicit",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
