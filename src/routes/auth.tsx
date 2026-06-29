import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isLocalStorageMode } from "@/lib/app-config";
import { authRequired, fetchProfile, getAuthSession } from "@/lib/auth-session";
import { mustChangePassword } from "@/lib/auth-password";
import { isOAuthCallbackPath } from "@/lib/auth-session-policy";

function isAuthPasswordFlowPath(pathname: string): boolean {
  return (
    pathname.endsWith("/auth/forgot-password") ||
    pathname.endsWith("/auth/reset-password")
  );
}

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    if (isLocalStorageMode()) throw redirect({ to: "/dashboard" });
    if (isAuthPasswordFlowPath(location.pathname)) return;
    // Let auth.index finish the Microsoft redirect before redirecting away.
    if (isOAuthCallbackPath()) return;

    const session = await getAuthSession();
    if (session) {
      const profile = await fetchProfile(session.user.id);
      throw redirect({
        to: mustChangePassword(session.user, profile) ? "/account/password" : "/dashboard",
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
