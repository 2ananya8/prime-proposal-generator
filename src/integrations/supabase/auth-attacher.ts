// Auth attacher — in local-dev mode there is no Supabase session.
// The middleware still runs but simply passes through with no headers.
import { createMiddleware } from "@tanstack/react-start";
import { isLocalStorageMode } from "@/lib/app-config";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (isLocalStorageMode()) {
      return next({ headers: {} });
    }
    // When Supabase is configured, attach the bearer token
    const { supabase } = await import("./client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
