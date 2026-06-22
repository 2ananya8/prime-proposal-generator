import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-password";

type NewPasswordFormProps = {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
  submitLabel: string;
  passwordId?: string;
  confirmId?: string;
};

export function NewPasswordForm({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
  busy,
  submitLabel,
  passwordId = "new-password",
  confirmId = "confirm-password",
}: NewPasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={passwordId}>New password</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          minLength={MIN_PASSWORD_LENGTH}
        />
        <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={confirmId}>Confirm password</Label>
        <Input
          id={confirmId}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          minLength={MIN_PASSWORD_LENGTH}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
