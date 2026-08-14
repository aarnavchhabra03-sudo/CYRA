-- STAGE 14.3 — MULTI-SOURCE LITERATURE REVIEW MIGRATION
-- Enables persistent multi-document cross-paper literature review storage.

CREATE TABLE IF NOT EXISTS public.research_literature_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  research_question TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'comparative',
  review JSONB NOT NULL,
  source_document_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.research_literature_reviews ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Users can only view their own literature reviews
CREATE POLICY "Users can view own literature reviews"
  ON public.research_literature_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. INSERT Policy: Users can only insert literature reviews for themselves
CREATE POLICY "Users can insert own literature reviews"
  ON public.research_literature_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy: Users can only update their own literature reviews
CREATE POLICY "Users can update own literature reviews"
  ON public.research_literature_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE Policy: Users can only delete their own literature reviews
CREATE POLICY "Users can delete own literature reviews"
  ON public.research_literature_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_research_literature_user_created
  ON public.research_literature_reviews(user_id, created_at DESC);
