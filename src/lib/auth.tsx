import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authRequired, fetchProfile, signOut as authSignOut, type AppProfile } from "./auth-session";
import {
  beginPasswordRecoveryFlow,
  bindAuthSessionToPage,
  clearLegacyPersistedAuth,
  getAuthSessionPolicyFailure,
  isOAuthCallbackPath,
  isOAuthSignInFlow,
  msUntilAuthExpiry,
} from "./auth-session-policy";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(authRequired());

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
    return p;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    await loadProfile(session.user.id);
  }, [loadProfile, session?.user?.id]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setProfile(null);
  }, []);

  const enforceSessionPolicy = useCallback(async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const failure = getAuthSessionPolicyFailure(Boolean(data.session));
    if (failure) {
      await signOut();
      if (typeof window !== "undefined" && !window.location.pathname.endsWith("/auth")) {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        window.location.href = `${base}/auth`;
      }
      return false;
    }
    return Boolean(data.session);
  }, [signOut]);

  useEffect(() => {
    if (!authRequired()) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleExpiryCheck = () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      const ms = msUntilAuthExpiry();
      if (ms == null) return;
      expiryTimer = setTimeout(() => {
        void enforceSessionPolicy();
      }, ms + 50);
    };

    (async () => {
      clearLegacyPersistedAuth();
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const failure = getAuthSessionPolicyFailure(Boolean(data.session));
      if (failure) {
        await signOut();
        if (mounted) setLoading(false);
        return;
      }
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id);
      }
      scheduleExpiryCheck();
      setLoading(false);
    })();

    let subscription: { unsubscribe: () => void } | undefined;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY" && nextSession) {
          beginPasswordRecoveryFlow();
          bindAuthSessionToPage();
        }
        if (event === "SIGNED_IN" && nextSession) {
          // Bind before policy check — signInWithPassword / OAuth may not have run yet when this fires.
          bindAuthSessionToPage();
          scheduleExpiryCheck();
        }
        if (event === "INITIAL_SESSION" && nextSession && (isOAuthCallbackPath() || isOAuthSignInFlow())) {
          bindAuthSessionToPage();
          scheduleExpiryCheck();
        }
        if (event === "SIGNED_OUT" && expiryTimer) {
          clearTimeout(expiryTimer);
        }
        const failure = getAuthSessionPolicyFailure(Boolean(nextSession));
        if (failure) {
          await signOut();
          return;
        }
        setSession(nextSession);
        if (nextSession?.user?.id) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      });
      subscription = data.subscription;
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void enforceSessionPolicy();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      if (expiryTimer) clearTimeout(expiryTimer);
      subscription?.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadProfile, signOut, enforceSessionPolicy]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
