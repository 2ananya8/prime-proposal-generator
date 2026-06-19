type EnvSource = Record<string, string | boolean | undefined>;

function readEnv(): EnvSource {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env as EnvSource;
  }
  return (typeof process !== "undefined" ? process.env : {}) as EnvSource;
}

export function getSupabaseUrl(env: EnvSource = readEnv()): string | undefined {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  return typeof url === "string" && url.length > 0 ? url : undefined;
}

export function getSupabaseAnonKey(env: EnvSource = readEnv()): string | undefined {
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY;
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

export function getAnthropicApiKey(env: EnvSource = readEnv()): string | undefined {
  const key = env.VITE_ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY;
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

export function getFirecrawlApiKey(env: EnvSource = readEnv()): string | undefined {
  const key = env.VITE_FIRECRAWL_API_KEY ?? env.FIRECRAWL_API_KEY;
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

/** True when Supabase URL + anon key are configured. */
export function hasSupabaseConfig(env: EnvSource = readEnv()): boolean {
  return !!(getSupabaseUrl(env) && getSupabaseAnonKey(env));
}

/**
 * Browser localStorage mode — only when Supabase is not configured and
 * VITE_LOCAL_DEV is explicitly true.
 */
export function isLocalStorageMode(env: EnvSource = readEnv()): boolean {
  if (hasSupabaseConfig(env)) return false;
  return env.VITE_LOCAL_DEV === true || env.VITE_LOCAL_DEV === "true";
}
