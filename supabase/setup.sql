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

-- Profiles (app roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_admin
  ON public.profiles (role) WHERE role = 'admin';

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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, must_change_password)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissions (authenticated only — no anon access)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_prime_sso_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  result public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NULL OR split_part(user_email, '@', 2) <> 'primeinfoserv.com' THEN
    RAISE EXCEPTION 'Auto-provision is only available for @primeinfoserv.com accounts';
  END IF;

  INSERT INTO public.profiles (id, email, role, must_change_password)
  VALUES (uid, user_email, 'user', false)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO result FROM public.profiles WHERE id = uid;
  IF result IS NULL THEN
    RAISE EXCEPTION 'Could not create profile';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_prime_sso_profile() TO authenticated;

DROP POLICY IF EXISTS "anon_all_services" ON public.services;
DROP POLICY IF EXISTS "anon_all_proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can read services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can delete services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can read proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can update proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can delete proposals" ON public.proposals;

DROP POLICY IF EXISTS "services_select_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_insert_own" ON public.services;
DROP POLICY IF EXISTS "services_update_own_or_admin" ON public.services;
DROP POLICY IF EXISTS "services_delete_own_or_admin" ON public.services;

CREATE POLICY "services_select_authenticated" ON public.services
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_insert_own" ON public.services
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "services_update_own_or_admin" ON public.services
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid())
  WITH CHECK (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "services_delete_own_or_admin" ON public.services
  FOR DELETE TO authenticated USING (public.is_admin() OR created_by = auth.uid());

DROP POLICY IF EXISTS "proposals_select_authenticated" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_own_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_own_or_admin" ON public.proposals;

CREATE POLICY "proposals_select_authenticated" ON public.proposals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "proposals_insert_own" ON public.proposals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "proposals_update_own_or_admin" ON public.proposals
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid())
  WITH CHECK (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "proposals_delete_own_or_admin" ON public.proposals
  FOR DELETE TO authenticated USING (public.is_admin() OR created_by = auth.uid());

NOTIFY pgrst, 'reload schema';
