-- STAGE 14.0 — RESEARCH LIBRARY & PERSISTENCE MIGRATION
-- Enables persistent user research documents, synthesis briefs, and learning path links.

CREATE TABLE IF NOT EXISTS public.research_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  query TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'general',
  brief JSONB NOT NULL,
  learning_path_id UUID NULL REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.research_documents ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Users can only view their own research documents
CREATE POLICY "Users can view own research documents"
  ON public.research_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. INSERT Policy: Users can only insert research documents for themselves
CREATE POLICY "Users can insert own research documents"
  ON public.research_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy: Users can only update their own research documents
CREATE POLICY "Users can update own research documents"
  ON public.research_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE Policy: Users can only delete their own research documents
CREATE POLICY "Users can delete own research documents"
  ON public.research_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_research_documents_user_created
  ON public.research_documents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_documents_user_title
  ON public.research_documents(user_id, title);

CREATE INDEX IF NOT EXISTS idx_research_documents_learning_path
  ON public.research_documents(learning_path_id);
