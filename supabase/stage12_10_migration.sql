-- ============================================================
-- CYRA AI — STAGE 12.10 SPACED REPETITION MIGRATION
-- ============================================================

-- 1. Add last_reviewed_at to user_concept_mastery
ALTER TABLE public.user_concept_mastery
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ NULL;

-- 2. Backfill existing rows: use last_practiced_at or updated_at
UPDATE public.user_concept_mastery
SET last_reviewed_at = COALESCE(last_practiced_at, updated_at)
WHERE last_reviewed_at IS NULL;

-- 3. Add summary to ai_tutor_conversations
ALTER TABLE public.ai_tutor_conversations
  ADD COLUMN IF NOT EXISTS summary TEXT NULL;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_last_reviewed
  ON public.user_concept_mastery(last_reviewed_at);

-- 5. Reload Schema cache
NOTIFY pgrst, 'reload schema';
