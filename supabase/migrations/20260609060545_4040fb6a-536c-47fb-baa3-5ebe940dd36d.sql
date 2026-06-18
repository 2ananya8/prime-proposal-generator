
-- Services table (reusable templates)
CREATE TABLE public.services (
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "Authenticated can update services" ON public.services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete services" ON public.services FOR DELETE TO authenticated USING (true);

-- Proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_website TEXT,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read proposals" ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "Authenticated can update proposals" ON public.proposals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete proposals" ON public.proposals FOR DELETE TO authenticated USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER proposals_set_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
