-- Dev-only: allow anonymous read/write on services and proposals (no login required).
-- Run in Supabase SQL editor when switching off VITE_LOCAL_DEV.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO anon;

CREATE POLICY "anon_all_services" ON public.services FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_proposals" ON public.proposals FOR ALL TO anon USING (true) WITH CHECK (true);
