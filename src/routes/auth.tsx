import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authRequired, fetchProfile, getAuthSession, signInWithPassword } from "@/lib/auth-session";
import { isLocalStorageMode } from "@/lib/app-config";
import { publicAsset } from "@/lib/public-asset";
import { PRIME_LOGO_ALT } from "@/lib/proposal-header-footer.constants";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    if (isLocalStorageMode()) throw redirect({ to: "/dashboard" });
    const session = await getAuthSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
      const profile = await fetchProfile(user.id);
      if (!profile) {
        await import("@/integrations/supabase/client").then(({ supabase }) => supabase.auth.signOut());
        toast.error("Account not provisioned — contact your admin");
        return;
      }
      toast.success("Signed in");
      nav({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!authRequired()) return null;

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
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
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
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
