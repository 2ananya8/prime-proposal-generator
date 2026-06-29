import type { ServiceFormValue } from "@/components/ServiceForm";
import { isLocalStorageMode } from "./app-config";
import { validateLogoDataUrl } from "./image-upload";
import { localStore } from "./local-data-store";

/** @deprecated Use {@link isLocalStorageMode} — kept for existing imports. */
export const isLocalDev = isLocalStorageMode();

async function sb() {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (isLocalStorageMode()) return null;
  const supabase = await sb();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function formatDbError(error: { message?: string; code?: string }) {
  const msg = error.message ?? "Database error";
  if (/schema cache|relation.*does not exist|Could not find the table/i.test(msg)) {
    return "Database tables are missing. Open Supabase Dashboard → SQL Editor, run supabase/setup.sql, then try again.";
  }
  if (/row-level security|permission denied|42501/i.test(msg)) {
    return "You do not have permission to perform this action.";
  }
  return msg;
}

export async function listServices() {
  if (isLocalStorageMode()) {
    return localStore.listServices().map(({ id, name, service_type, short_code, updated_at, created_by }) => ({
      id, name, service_type, short_code, updated_at, created_by,
    }));
  }
  const supabase = await sb();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, service_type, short_code, updated_at, created_by")
    .order("name");
  if (error) throw new Error(formatDbError(error));
  return data ?? [];
}

export async function listServicesFull() {
  if (isLocalStorageMode()) return localStore.listServices();
  const supabase = await sb();
  const { data, error } = await supabase.from("services").select("*").order("name");
  if (error) throw new Error(formatDbError(error));
  return data ?? [];
}

export async function countServices() {
  if (isLocalStorageMode()) return localStore.listServices().length;
  const supabase = await sb();
  const { count, error } = await supabase.from("services").select("id", { count: "exact", head: true });
  if (error) throw new Error(formatDbError(error));
  return count ?? 0;
}

export async function getService(id: string) {
  if (isLocalStorageMode()) {
    const row = localStore.getService(id);
    if (!row) throw new Error("Service not found");
    return row;
  }
  const supabase = await sb();
  const { data, error } = await supabase.from("services").select("*").eq("id", id).single();
  if (error) throw new Error(formatDbError(error));
  return data;
}

function serviceFormToRow(value: ServiceFormValue) {
  const { prerequisites, ...rest } = value;
  return {
    ...rest,
    prerequisites_prime: prerequisites,
    prerequisites_client: [],
  };
}

export async function createService(value: ServiceFormValue) {
  const row = serviceFormToRow(value);
  if (isLocalStorageMode()) return localStore.createService(value);
  const supabase = await sb();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to create a service.");
  const { data, error } = await supabase.from("services").insert({ ...row, created_by: userId }).select("id").single();
  if (error) throw new Error(formatDbError(error));
  return data!;
}

export async function updateService(id: string, value: ServiceFormValue) {
  const row = serviceFormToRow(value);
  if (isLocalStorageMode()) return localStore.updateService(id, value);
  const supabase = await sb();
  const { error } = await supabase.from("services").update(row).eq("id", id);
  if (error) throw new Error(formatDbError(error));
}

export async function deleteService(id: string) {
  if (isLocalStorageMode()) return localStore.deleteService(id);
  const supabase = await sb();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw new Error(formatDbError(error));
}

export type CreateProposalInput = {
  proposal_type?: "standard" | "two_page";
  client_name: string;
  client_logo?: string | null;
  client_website: string | null;
  service_id: string | null;
  proposal_date: string;
  client_research: unknown;
  executive_summary: string;
  scope_details: Record<string, unknown>;
  timeline_overrides: unknown[];
  commercials: Record<string, unknown>;
  payment_milestones: unknown[];
  extra_fields: unknown[];
};

export async function listProposals(proposalType: "standard" | "two_page" = "standard") {
  if (isLocalStorageMode()) {
    return localStore.listProposals().filter((p) => (p.proposal_type ?? "standard") === proposalType).map((p) => {
      const service = p.service_id ? localStore.getService(p.service_id) : null;
      return {
        id: p.id,
        proposal_type: p.proposal_type ?? "standard",
        client_name: p.client_name,
        proposal_date: p.proposal_date,
        created_by: p.created_by,
        generated_pdf_path: p.generated_pdf_path,
        service: service ? { name: service.name, short_code: service.short_code } : null,
      };
    });
  }
  const supabase = await sb();
  const { data, error } = await supabase
    .from("proposals")
    .select("id, proposal_type, client_name, proposal_date, created_by, service:services(name, short_code), generated_pdf_path")
    .eq("proposal_type", proposalType)
    .order("created_at", { ascending: false });
  if (error) throw new Error(formatDbError(error));
  return data ?? [];
}

export async function listRecentProposals() {
  if (isLocalStorageMode()) {
    return localStore.listProposals().filter((p) => (p.proposal_type ?? "standard") === "standard").slice(0, 5).map((p) => {
      const service = p.service_id ? localStore.getService(p.service_id) : null;
      return {
        id: p.id,
        client_name: p.client_name,
        proposal_date: p.proposal_date,
        created_by: p.created_by,
        service: service ? { name: service.name } : null,
      };
    });
  }
  const supabase = await sb();
  const { data, error } = await supabase
    .from("proposals")
    .select("id, client_name, proposal_date, created_by, service:services(name)")
    .eq("proposal_type", "standard")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(formatDbError(error));
  return data ?? [];
}

export async function getProposal(id: string) {
  if (isLocalStorageMode()) {
    const row = localStore.getProposal(id);
    if (!row) throw new Error("Proposal not found");
    return row;
  }
  const supabase = await sb();
  const { data, error } = await supabase.from("proposals").select("*, service:services(*)").eq("id", id).single();
  if (error) throw new Error(formatDbError(error));
  return data;
}

function assertValidClientLogo(client_logo: string | null | undefined) {
  if (client_logo == null) return;
  const check = validateLogoDataUrl(client_logo);
  if (!check.ok) throw new Error(check.message);
}

export async function createProposal(input: CreateProposalInput) {
  assertValidClientLogo(input.client_logo);
  const proposalType = input.proposal_type ?? "standard";
  if (isLocalStorageMode()) return localStore.createProposal({ ...input, proposal_type: proposalType });
  const supabase = await sb();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("You must be signed in to create a proposal.");
  const { data, error } = await supabase
    .from("proposals")
    .insert({ ...input, proposal_type: proposalType, created_by: userId })
    .select("id")
    .single();
  if (error) throw new Error(formatDbError(error));
  return data!;
}

export async function updateProposalSummary(id: string, executive_summary: string) {
  if (isLocalStorageMode()) return localStore.updateProposalSummary(id, executive_summary);
  const supabase = await sb();
  const { error } = await supabase.from("proposals").update({ executive_summary }).eq("id", id);
  if (error) throw new Error(formatDbError(error));
}

export async function updateProposalClientLogo(id: string, client_logo: string | null) {
  assertValidClientLogo(client_logo);
  if (isLocalStorageMode()) return localStore.updateProposalClientLogo(id, client_logo);
  const supabase = await sb();
  const { error } = await supabase.from("proposals").update({ client_logo }).eq("id", id);
  if (error) throw new Error(formatDbError(error));
}

export async function updateProposal(
  id: string,
  patch: {
    client_name?: string;
    executive_summary?: string | null;
    commercials?: Record<string, unknown>;
  },
) {
  if (isLocalStorageMode()) {
    localStore.updateProposalFields(id, patch);
    return;
  }
  const supabase = await sb();
  const { error } = await supabase.from("proposals").update(patch).eq("id", id);
  if (error) throw new Error(formatDbError(error));
}

export async function deleteProposal(id: string) {
  if (isLocalStorageMode()) return localStore.deleteProposal(id);
  const supabase = await sb();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw new Error(formatDbError(error));
}

export async function listProfiles() {
  if (isLocalStorageMode()) return [];
  const supabase = await sb();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(formatDbError(error));
  return data ?? [];
}
