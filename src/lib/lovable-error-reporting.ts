// Lovable error reporting removed — stub kept so imports don't break.
export function reportLovableError(_error: unknown, _context: Record<string, unknown> = {}) {
  // no-op in standalone mode
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.error("[proposal-app error]", _error, _context);
  }
}
