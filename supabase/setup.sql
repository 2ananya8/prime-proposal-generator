-- Run this once in Supabase Dashboard → SQL Editor → New query → Run
-- https://supabase.com/dashboard/project/_/sql

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  short_code TEXT,
  approach_methodology JSONB NOT NULL DEFAULT '[]'::jsonb,
  executive_summary_template TEXT,
  project_objectives JSONB DEFAULT '[]'::jsonb,
  expected_benefits JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  coverage_matrix JSONB,
  prerequisites_prime JSONB DEFAULT '[]'::jsonb,
  prerequisites_client JSONB DEFAULT '[]'::jsonb,
  timeline_phases JSONB DEFAULT '[]'::jsonb,
  terms_conditions TEXT,
  extra_sections JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposals
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_website TEXT,
  client_logo TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_research JSONB,
  executive_summary TEXT,
  scope_details JSONB DEFAULT '{}'::jsonb,
  timeline_overrides JSONB DEFAULT '[]'::jsonb,
  commercials JSONB DEFAULT '{}'::jsonb,
  payment_milestones JSONB DEFAULT '[]'::jsonb,
  extra_fields JSONB DEFAULT '[]'::jsonb,
  generated_docx_path TEXT,
  generated_pdf_path TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS client_logo TEXT;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS services_set_updated_at ON public.services;
CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS proposals_set_updated_at ON public.proposals;
CREATE TRIGGER proposals_set_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated, anon, service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Authenticated policies
DROP POLICY IF EXISTS "Authenticated can read services" ON public.services;
CREATE POLICY "Authenticated can read services" ON public.services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can insert services" ON public.services;
CREATE POLICY "Authenticated can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "Authenticated can update services" ON public.services;
CREATE POLICY "Authenticated can update services" ON public.services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can delete services" ON public.services;
CREATE POLICY "Authenticated can delete services" ON public.services FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read proposals" ON public.proposals;
CREATE POLICY "Authenticated can read proposals" ON public.proposals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can insert proposals" ON public.proposals;
CREATE POLICY "Authenticated can insert proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "Authenticated can update proposals" ON public.proposals;
CREATE POLICY "Authenticated can update proposals" ON public.proposals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can delete proposals" ON public.proposals;
CREATE POLICY "Authenticated can delete proposals" ON public.proposals FOR DELETE TO authenticated USING (true);

-- Anonymous access (app uses anon key without login)
DROP POLICY IF EXISTS "anon_all_services" ON public.services;
CREATE POLICY "anon_all_services" ON public.services FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_proposals" ON public.proposals;
CREATE POLICY "anon_all_proposals" ON public.proposals FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tell PostgREST to reload schema (fixes "not in schema cache" after creating tables)
NOTIFY pgrst, 'reload schema';
