-- Client logo on proposals (cover + header)
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS client_logo TEXT;

-- Shared team access without login (anon key from .env)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO anon;

DROP POLICY IF EXISTS "anon_all_services" ON public.services;
CREATE POLICY "anon_all_services" ON public.services FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_proposals" ON public.proposals;
CREATE POLICY "anon_all_proposals" ON public.proposals FOR ALL TO anon USING (true) WITH CHECK (true);
