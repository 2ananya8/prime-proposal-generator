import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  authRequired,
  completeOAuthSignInIfNeeded,
  fetchProfileWithRetry,
  isOAuthCallbackUrl,
  signInWithMicrosoft,
  signInWithPassword,
} from "@/lib/auth-session";
import { mustChangePassword } from "@/lib/auth-password";
import { isPrimeInfoservEmail } from "@/lib/email-domain";
import { publicAsset } from "@/lib/public-asset";
import { PRIME_LOGO_ALT } from "@/lib/proposal-header-footer.constants";
import { toast } from "sonner";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export const Route = createFileRoute("/auth/")({
  component: AuthLoginPage,
});

function AuthLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(isOAuthCallbackUrl());

  const finishSignIn = useCallback(async (userId: string) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("Login failed");

    const profile = await fetchProfileWithRetry(userId);
    if (!profile) {
      await supabase.auth.signOut();
      toast.error("Account not provisioned — contact your admin");
      return;
    }
    toast.success("Signed in");
    nav({ to: mustChangePassword(user, profile) ? "/account/password" : "/dashboard" });
  }, [nav]);

  useEffect(() => {
    if (!isOAuthCallbackUrl()) return;
    let cancelled = false;

    (async () => {
      try {
        const ok = await completeOAuthSignInIfNeeded();
        if (!ok || cancelled) {
          if (!cancelled) {
            toast.error("Microsoft sign-in could not be completed. Please try again.");
            setOauthBusy(false);
          }
          return;
        }
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user?.id || cancelled) return;
        await finishSignIn(data.session.user.id);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Microsoft sign-in failed";
        toast.error(msg);
        setOauthBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [finishSignIn]);

  const signInWithMicrosoftClick = async () => {
    setOauthBusy(true);
    try {
      await signInWithMicrosoft();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Microsoft sign-in failed";
      toast.error(msg);
      setOauthBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter email and password");
      return;
    }
    setBusy(true);
    try {
      const { user } = await signInWithPassword(email.trim(), password);
      if (!user) throw new Error("Login failed");
      await finishSignIn(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!authRequired()) return null;

  if (oauthBusy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Completing Microsoft sign-in…
          </CardContent>
        </Card>
      </div>
    );
  }

  const showSsoHint = email.trim() && isPrimeInfoservEmail(email);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img
            src={publicAsset("/assets/prime-logo.png")}
            alt={PRIME_LOGO_ALT}
            className="h-10 w-auto mx-auto object-contain"
          />
          <div>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Proposal Generator — Prime Infoserv</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy || oauthBusy}
            onClick={() => void signInWithMicrosoftClick()}
          >
            <MicrosoftIcon className="h-4 w-4 mr-2" />
            Sign in with Microsoft
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Recommended for @primeinfoserv.com employees
          </p>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@primeinfoserv.com"
              />
              {showSsoHint ? (
                <p className="text-xs text-muted-foreground">
                  Prime Infoserv account — use Microsoft above, or continue with your password.
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || oauthBusy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm">
              <Link to="/auth/forgot-password" className="text-muted-foreground hover:underline">
                Forgot password?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
