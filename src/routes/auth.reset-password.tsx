import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { authRequired } from "@/lib/auth-session";
import {
  RESET_LINK_VERIFY_TIMEOUT_MS,
  updatePassword,
  validatePasswordPair,
  waitForPasswordRecoverySession,
} from "@/lib/auth-password";
import { publicAsset } from "@/lib/public-asset";
import { PRIME_LOGO_ALT } from "@/lib/proposal-header-footer.constants";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!authRequired()) return;

    let mounted = true;

    void waitForPasswordRecoverySession(RESET_LINK_VERIFY_TIMEOUT_MS).then((ok) => {
      if (!mounted) return;
      if (ok) {
        setReady(true);
        setInvalid(false);
      } else {
        setInvalid(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePasswordPair(password, confirm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success("Password updated — sign in with your new password");
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
      nav({ to: "/auth" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  if (!authRequired()) return null;

  const verifySeconds = RESET_LINK_VERIFY_TIMEOUT_MS / 1000;

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
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription>
              {invalid
                ? "This reset link is invalid or has expired. Request a new link from the same browser where you asked for the reset, then open the email promptly."
                : ready
                  ? "Enter and confirm your new password."
                  : `Verifying your reset link… (up to ${verifySeconds}s)`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ready && !invalid ? (
            <NewPasswordForm
              password={password}
              confirm={confirm}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirm}
              onSubmit={submit}
              busy={busy}
              submitLabel="Update password"
            />
          ) : null}
          <Link
            to={invalid ? "/auth/forgot-password" : "/auth"}
            className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {invalid ? "Request a new reset link" : "Back to sign in"}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
