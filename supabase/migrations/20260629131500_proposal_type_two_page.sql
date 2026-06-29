-- Add proposal type support to separate standard and 2-page proposals in UI.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS proposal_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (proposal_type IN ('standard', 'two_page'));

UPDATE public.proposals
SET proposal_type = 'standard'
WHERE proposal_type IS NULL;
