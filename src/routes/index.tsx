import { createFileRoute, redirect } from "@tanstack/react-router";
import { authRequired, getAuthSession } from "@/lib/auth-session";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (authRequired()) {
      const session = await getAuthSession();
      throw redirect({ to: session ? "/dashboard" : "/auth" });
    }
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
