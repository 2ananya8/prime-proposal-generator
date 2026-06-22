import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProfiles } from "@/lib/data-api";
import { adminCreateUser, adminDeleteUser } from "@/lib/admin-users";
import { getAuthSession, fetchProfile, authRequired } from "@/lib/auth-session";
import { toast } from "sonner";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    if (!authRequired()) throw redirect({ to: "/dashboard" });
    const session = await getAuthSession();
    if (!session?.user?.id) throw redirect({ to: "/auth" });
    const profile = await fetchProfile(session.user.id);
    if (profile?.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Users — Prime Infoserv" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const users = useQuery({
    queryKey: ["profiles"],
    queryFn: listProfiles,
  });

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter email and temporary password");
      return;
    }
    setBusy(true);
    try {
      await adminCreateUser(email, password);
      toast.success("User created");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Remove user ${userEmail}? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(userId);
      toast.success("User removed");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" />Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Add or remove team members. Share temporary passwords securely out of band.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add user</CardTitle>
          <CardDescription>Creates an account with email and a temporary password (min. 8 characters). The user must set a new password on first sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={busy}>
              <UserPlus className="h-4 w-4 mr-1" />
              {busy ? "Creating…" : "Add user"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {(users.data ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
              <div>
                <div className="text-sm font-medium">{u.email}</div>
                <div className="text-xs text-muted-foreground capitalize">{u.role} · joined {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              {u.role !== "admin" ? (
                <Button variant="ghost" size="icon" onClick={() => void removeUser(u.id, u.email)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground px-2">Admin</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
