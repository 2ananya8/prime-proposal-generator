import type { ServiceFormValue } from "@/components/ServiceForm";

const SERVICES_KEY = "prime-local-services";
const PROPOSALS_KEY = "prime-local-proposals";

export type LocalService = ServiceFormValue & {
  id: string;
  created_by: null;
  created_at: string;
  updated_at: string;
};

export type LocalProposal = {
  id: string;
  proposal_type: "standard" | "two_page";
  client_name: string;
  client_logo: string | null;
  client_website: string | null;
  service_id: string | null;
  proposal_date: string;
  client_research: unknown;
  executive_summary: string | null;
  scope_details: Record<string, unknown>;
  timeline_overrides: unknown[];
  commercials: Record<string, unknown>;
  payment_milestones: unknown[];
  extra_fields: unknown[];
  generated_docx_path: string | null;
  generated_pdf_path: string | null;
  created_by: null;
  created_at: string;
  updated_at: string;
};

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function now() {
  return new Date().toISOString();
}

export const localStore = {
  listServices(): LocalService[] {
    return read<LocalService>(SERVICES_KEY).sort((a, b) => a.name.localeCompare(b.name));
  },
  getService(id: string) {
    return read<LocalService>(SERVICES_KEY).find((s) => s.id === id) ?? null;
  },
  createService(value: ServiceFormValue): LocalService {
    const row: LocalService = {
      ...value,
      id: crypto.randomUUID(),
      created_by: null,
      created_at: now(),
      updated_at: now(),
    };
    const rows = read<LocalService>(SERVICES_KEY);
    rows.push(row);
    write(SERVICES_KEY, rows);
    return row;
  },
  updateService(id: string, value: ServiceFormValue) {
    const rows = read<LocalService>(SERVICES_KEY);
    const i = rows.findIndex((s) => s.id === id);
    if (i < 0) throw new Error("Service not found");
    rows[i] = { ...rows[i], ...value, updated_at: now() };
    write(SERVICES_KEY, rows);
  },
  deleteService(id: string) {
    write(
      SERVICES_KEY,
      read<LocalService>(SERVICES_KEY).filter((s) => s.id !== id),
    );
  },

  listProposals(): LocalProposal[] {
    return read<LocalProposal>(PROPOSALS_KEY).sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
  },
  getProposal(id: string) {
    const proposal = read<LocalProposal>(PROPOSALS_KEY).find((p) => p.id === id);
    if (!proposal) return null;
    const service = proposal.service_id ? localStore.getService(proposal.service_id) : null;
    return { ...proposal, service };
  },
  createProposal(input: Omit<LocalProposal, "id" | "created_at" | "updated_at" | "generated_docx_path" | "generated_pdf_path" | "created_by">): LocalProposal {
    const row: LocalProposal = {
      ...input,
      proposal_type: input.proposal_type ?? "standard",
      client_logo: input.client_logo ?? null,
      id: crypto.randomUUID(),
      generated_docx_path: null,
      generated_pdf_path: null,
      created_by: null,
      created_at: now(),
      updated_at: now(),
    };
    const rows = read<LocalProposal>(PROPOSALS_KEY);
    rows.push(row);
    write(PROPOSALS_KEY, rows);
    return row;
  },
  updateProposalSummary(id: string, executive_summary: string) {
    const rows = read<LocalProposal>(PROPOSALS_KEY);
    const i = rows.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Proposal not found");
    rows[i] = { ...rows[i], executive_summary, updated_at: now() };
    write(PROPOSALS_KEY, rows);
  },
  updateProposalClientLogo(id: string, client_logo: string | null) {
    const rows = read<LocalProposal>(PROPOSALS_KEY);
    const i = rows.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Proposal not found");
    rows[i] = { ...rows[i], client_logo, updated_at: now() };
    write(PROPOSALS_KEY, rows);
  },
  updateProposalFields(
    id: string,
    patch: Partial<Pick<LocalProposal, "client_name" | "client_logo" | "executive_summary" | "commercials">>,
  ) {
    const rows = read<LocalProposal>(PROPOSALS_KEY);
    const i = rows.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Proposal not found");
    rows[i] = { ...rows[i], ...patch, updated_at: now() };
    write(PROPOSALS_KEY, rows);
  },
  deleteProposal(id: string) {
    write(
      PROPOSALS_KEY,
      read<LocalProposal>(PROPOSALS_KEY).filter((p) => p.id !== id),
    );
  },
};
