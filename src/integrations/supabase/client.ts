// Supabase browser client — used when Supabase credentials are configured.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/app-config";

function createSupabaseClient() {
  const SUPABASE_URL = getSupabaseUrl();
  const SUPABASE_PUBLISHABLE_KEY = getSupabaseAnonKey();

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null as any;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
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
