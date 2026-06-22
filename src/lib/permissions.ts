import type { AppProfile } from "./auth-session";

type Ownable = { created_by?: string | null };

export function isAdmin(profile: AppProfile | null | undefined): boolean {
  return profile?.role === "admin";
}

export function canEditService(
  profile: AppProfile | null | undefined,
  userId: string | null | undefined,
  service: Ownable,
): boolean {
  if (isAdmin(profile)) return true;
  if (!userId || !service.created_by) return false;
  return service.created_by === userId;
}

export function canEditProposal(
  profile: AppProfile | null | undefined,
  userId: string | null | undefined,
  proposal: Ownable,
): boolean {
  if (isAdmin(profile)) return true;
  if (!userId || !proposal.created_by) return false;
  return proposal.created_by === userId;
}

export function permissionDeniedMessage(kind: "service" | "proposal"): string {
  return kind === "service"
    ? "You can only edit or delete services you created."
    : "You can only edit or delete proposals you created.";
}
