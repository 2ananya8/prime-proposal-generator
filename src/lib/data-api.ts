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

function formatDbError(error: { message?: string; code?: string }) {
  const msg = error.message ?? "Database error";
  if (/schema cache|relation.*does not exist|Could not find the table/i.test(msg)) {
    return "Database tables are missing. Open Supabase Dashboard → SQL Editor, run supabase/setup.sql, then try again.";
  }
  return msg;
}

export async function listServices() {
  if (isLocalStorageMode()) {
    return localStore.listServices().map(({ id, name, service_type, short_code, updated_at }) => ({
      id, name, service_type, short_code, updated_at,
    }));
  }
  const supabase = await sb();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, service_type, short_code, updated_at")
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
  const { data, error } = await supabase.from("services").insert({ ...row, created_by: null }).select("id").single();
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
  client_name: string;
  client_logo?: string | null;
  client_website: string | null;
  service_id: string;
  proposal_date: string;
  client_research: unknown;
  executive_summary: string;
  scope_details: Record<string, unknown>;
  timeline_overrides: unknown[];
  commercials: Record<string, unknown>;
  payment_milestones: unknown[];
  extra_fields: unknown[];
};

export async function listProposals() {
  if (isLocalStorageMode()) {
    return localStore.listProposals().map((p) => {
      const service = p.service_id ? localStore.getService(p.service_id) : null;
      return {
        id: p.id,
        client_name: p.client_name,
        proposal_date: p.proposal_date,
        generated_pdf_path: p.generated_pdf_path,
        service: service ? { name: service.name, short_code: service.short_code } : null,
      };
    });
  }
  const supabase = await sb();
  const { data, error } = await supabase
    .from("proposals")
    .select("id, client_name, proposal_date, service:services(name, short_code), generated_pdf_path")
    .order("created_at", { ascending: false });
  if (error) throw new Error(formatDbError(error));
  return data ?? [];
}

export async function listRecentProposals() {
  if (isLocalStorageMode()) {
    return localStore.listProposals().slice(0, 5).map((p) => {
      const service = p.service_id ? localStore.getService(p.service_id) : null;
      return {
        id: p.id,
        client_name: p.client_name,
        proposal_date: p.proposal_date,
        service: service ? { name: service.name } : null,
      };
    });
  }
  const supabase = await sb();
  const { data, error } = await supabase
    .from("proposals")
    .select("id, client_name, proposal_date, service:services(name)")
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
  if (isLocalStorageMode()) return localStore.createProposal(input);
  const supabase = await sb();
  const { data, error } = await supabase.from("proposals").insert({ ...input, created_by: null }).select("id").single();
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

export async function deleteProposal(id: string) {
  if (isLocalStorageMode()) return localStore.deleteProposal(id);
  const supabase = await sb();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw new Error(formatDbError(error));
}
