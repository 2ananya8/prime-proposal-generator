const PKCE_BRIDGE_PREFIX = "prime_pkce_bridge:";

/** After requesting a reset email, copy PKCE verifier to localStorage (shared across tabs). */
export function bridgePkceVerifierToLocalStorage(): void {
  if (typeof window === "undefined") return;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.includes("code-verifier")) {
      const value = sessionStorage.getItem(key);
      if (value) localStorage.setItem(`${PKCE_BRIDGE_PREFIX}${key}`, value);
    }
  }
}

/** Before exchanging ?code= from an email link, restore verifier into sessionStorage. */
export function restorePkceVerifierFromBridgeIfNeeded(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.get("code")) return;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PKCE_BRIDGE_PREFIX)) continue;
    const storageKey = key.slice(PKCE_BRIDGE_PREFIX.length);
    const value = localStorage.getItem(key);
    if (value) sessionStorage.setItem(storageKey, value);
  }
}

export function clearPkceVerifierBridge(): void {
  if (typeof window === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(PKCE_BRIDGE_PREFIX)) localStorage.removeItem(key);
  }
}
