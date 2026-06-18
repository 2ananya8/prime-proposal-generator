import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { FileText, Wrench, LayoutDashboard } from "lucide-react";
import { hasSupabaseConfig, isLocalStorageMode } from "@/lib/app-config";
import { PRIME_LOGO_ALT } from "@/lib/proposal-header-footer.constants";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Shell,
});

function Shell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isProposalPreview = /\/proposals\/[^/]+\/preview$/.test(path);

  if (isProposalPreview) {
    return (
      <div className="min-h-screen">
        <Outlet />
      </div>
    );
  }

  const item = (to: string, label: string, Icon: any) => {
    const active = path === to || path.startsWith(to + "/");
    return (
      <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };
  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-60 border-r bg-background flex flex-col">
        <div className="border-b p-3">
          <div className="flex items-center justify-center px-3 py-2">
            <img
              src="/assets/prime-logo.png"
              alt={PRIME_LOGO_ALT}
              className="h-9 w-auto max-w-full object-contain"
            />
          </div>
        </div>
        <nav className="flex-1 p-3 pt-2 space-y-1">
          {item("/dashboard", "Dashboard", LayoutDashboard)}
          {item("/services", "Services", Wrench)}
          {item("/proposals", "Proposals", FileText)}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-x-hidden">
        {isLocalStorageMode() && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Local mode — data is saved in this browser only. Add Supabase keys to <code className="text-xs">.env</code> to sync across devices.
          </div>
        )}
        {hasSupabaseConfig() && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Shared database — services and proposals are in sync across devices.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}