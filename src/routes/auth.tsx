import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isLocalStorageMode } from "@/lib/app-config";
import { authRequired, getAuthSession } from "@/lib/auth-session";
import { mustChangePassword } from "@/lib/auth-password";

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

    const session = await getAuthSession();
    if (session) {
      throw redirect({
        to: mustChangePassword(session.user) ? "/account/password" : "/dashboard",
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
