import { createFileRoute, redirect } from "@tanstack/react-router";

// Auth disabled — focus on core content first.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
