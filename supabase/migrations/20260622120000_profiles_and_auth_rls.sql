-- Profiles table for app roles (admin / user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_admin
  ON public.profiles (role) WHERE role = 'admin';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: is current user admin?
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

-- Auto-create profile when auth user is created (role = user; admin set via Dashboard SQL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Revoke anon access on services and proposals
DROP POLICY IF EXISTS "anon_all_services" ON public.services;
DROP POLICY IF EXISTS "anon_all_proposals" ON public.proposals;

REVOKE ALL ON public.services FROM anon;
REVOKE ALL ON public.proposals FROM anon;

-- Services RLS (replace open policies)
DROP POLICY IF EXISTS "Authenticated can read services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can delete services" ON public.services;

DROP POLICY IF EXISTS "services_select_authenticated" ON public.services;
DROP POLICY IF EXISTS "services_insert_own" ON public.services;
DROP POLICY IF EXISTS "services_update_own_or_admin" ON public.services;
DROP POLICY IF EXISTS "services_delete_own_or_admin" ON public.services;

CREATE POLICY "services_select_authenticated" ON public.services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "services_insert_own" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "services_update_own_or_admin" ON public.services
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid())
  WITH CHECK (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "services_delete_own_or_admin" ON public.services
  FOR DELETE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid());

-- Proposals RLS
DROP POLICY IF EXISTS "Authenticated can read proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can update proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can delete proposals" ON public.proposals;

DROP POLICY IF EXISTS "proposals_select_authenticated" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_own_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_own_or_admin" ON public.proposals;

CREATE POLICY "proposals_select_authenticated" ON public.proposals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "proposals_insert_own" ON public.proposals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "proposals_update_own_or_admin" ON public.proposals
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid())
  WITH CHECK (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "proposals_delete_own_or_admin" ON public.proposals
  FOR DELETE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid());

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
