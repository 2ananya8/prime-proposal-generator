import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { FileText, Wrench, LayoutDashboard, Users, LogOut, KeyRound } from "lucide-react";
import { hasSupabaseConfig, isLocalStorageMode } from "@/lib/app-config";
import { authRequired, getAuthSession } from "@/lib/auth-session";
import { mustChangePassword } from "@/lib/auth-password";
import { useAuth, useAuthOptional } from "@/lib/auth";
import { PRIME_LOGO_ALT } from "@/lib/proposal-header-footer.constants";
import { publicAsset } from "@/lib/public-asset";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (!authRequired()) return;
    const session = await getAuthSession();
    if (!session) throw redirect({ to: "/auth" });
    if (mustChangePassword(session.user) && location.pathname !== "/account/password") {
      throw redirect({ to: "/account/password" });
    }
  },
  component: Shell,
});

function Shell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isProposalPreview = /\/proposals\/[^/]+\/preview$/.test(path);
  const auth = useAuthOptional();
  const passwordChangeRequired = mustChangePassword(auth?.user);

  if (isProposalPreview || passwordChangeRequired) {
    return (
      <div className="min-h-screen">
        <Outlet />
      </div>
    );
  }

  const item = (to: string, label: string, Icon: React.ComponentType<{ className?: string }>) => {
    const active = path === to || path.startsWith(to + "/");
    return (
      <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };

  return (
    <div className="flex h-svh overflow-hidden bg-muted/20">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-background">
        <div className="border-b p-3 shrink-0">
          <div className="flex items-center justify-center px-3 py-2">
            <img
              src={publicAsset("/assets/prime-logo.png")}
              alt={PRIME_LOGO_ALT}
              className="h-9 w-auto max-w-full object-contain"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 pt-2 space-y-1">
          {item("/dashboard", "Dashboard", LayoutDashboard)}
          {item("/services", "Services", Wrench)}
          {item("/proposals", "Proposals", FileText)}
          {auth?.isAdmin ? item("/admin/users", "Users", Users) : null}
        </nav>
        {authRequired() && auth?.profile && !passwordChangeRequired && (
          <div className="border-t p-3 shrink-0 space-y-2">
            <p className="text-xs text-muted-foreground truncate px-1" title={auth.profile.email}>
              {auth.profile.email}
            </p>
            <Link
              to="/account/password"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
            <SignOutButton />
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
        {isLocalStorageMode() && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Local mode — data is saved in this browser only. Add Supabase keys to <code className="text-xs">.env</code> to sync across devices.
          </div>
        )}
        {hasSupabaseConfig() && !authRequired() && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Shared database — services and proposals are in sync across devices.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

function SignOutButton() {
  const auth = useAuth();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => void auth.signOut().then(() => { window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/auth`; })}
    >
      <LogOut className="h-4 w-4 mr-1" />
      Sign out
    </Button>
  );
}
