import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { useAuth } from "@/lib/auth";
import { authRequired, getAuthSession } from "@/lib/auth-session";
import { mustChangePassword, updatePassword, validatePasswordPair } from "@/lib/auth-password";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account/password")({
  beforeLoad: async () => {
    if (!authRequired()) throw redirect({ to: "/dashboard" });
    const session = await getAuthSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Password — Prime Infoserv" }] }),
  component: AccountPasswordPage,
});

function AccountPasswordPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const forced = mustChangePassword(auth.user);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

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
      await auth.refreshProfile();
      toast.success(forced ? "Password set — welcome!" : "Password updated");
      nav({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      {!forced ? (
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{forced ? "Set your password" : "Change password"}</CardTitle>
          <CardDescription>
            {forced
              ? "Your account uses a temporary password. Choose a new password before continuing."
              : "Update the password you use to sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPasswordForm
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            onSubmit={submit}
            busy={busy}
            submitLabel={forced ? "Continue" : "Save password"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
