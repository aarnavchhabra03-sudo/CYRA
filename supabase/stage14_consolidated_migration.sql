-- ============================================================
-- CYRA.AI — STAGE 14.0 + 14.5 CONSOLIDATED MIGRATION
-- Apply this in the Supabase SQL Editor to fix the Research Library.
-- All statements are idempotent (CREATE IF NOT EXISTS / CREATE POLICY IF NOT EXISTS equivalent).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PART 1: Stage 14.0 — research_documents table
-- ────────────────────────────────────────────────────────────

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

ALTER TABLE public.research_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_documents' AND policyname = 'Users can view own research documents'
  ) THEN
    CREATE POLICY "Users can view own research documents"
      ON public.research_documents FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_documents' AND policyname = 'Users can insert own research documents'
  ) THEN
    CREATE POLICY "Users can insert own research documents"
      ON public.research_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_documents' AND policyname = 'Users can update own research documents'
  ) THEN
    CREATE POLICY "Users can update own research documents"
      ON public.research_documents FOR UPDATE
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_documents' AND policyname = 'Users can delete own research documents'
  ) THEN
    CREATE POLICY "Users can delete own research documents"
      ON public.research_documents FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_research_documents_user_created
  ON public.research_documents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_documents_user_title
  ON public.research_documents(user_id, title);

CREATE INDEX IF NOT EXISTS idx_research_documents_learning_path
  ON public.research_documents(learning_path_id);

-- ────────────────────────────────────────────────────────────
-- PART 2: Stage 14.3 — literature_reviews table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.literature_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_ids UUID[] NOT NULL DEFAULT '{}',
  synthesis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.literature_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'literature_reviews' AND policyname = 'Users can view own literature reviews'
  ) THEN
    CREATE POLICY "Users can view own literature reviews"
      ON public.literature_reviews FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'literature_reviews' AND policyname = 'Users can insert own literature reviews'
  ) THEN
    CREATE POLICY "Users can insert own literature reviews"
      ON public.literature_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'literature_reviews' AND policyname = 'Users can update own literature reviews'
  ) THEN
    CREATE POLICY "Users can update own literature reviews"
      ON public.literature_reviews FOR UPDATE
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'literature_reviews' AND policyname = 'Users can delete own literature reviews'
  ) THEN
    CREATE POLICY "Users can delete own literature reviews"
      ON public.literature_reviews FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_literature_reviews_user_created
  ON public.literature_reviews(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- PART 3: Stage 14.5 — research_annotations table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.research_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  research_document_id UUID NOT NULL
    REFERENCES public.research_documents(id)
    ON DELETE CASCADE,

  citation_id TEXT NULL,

  annotation_type TEXT NOT NULL DEFAULT 'note',

  selected_text TEXT NULL,

  note TEXT NOT NULL,

  source_url TEXT NULL,

  source_title TEXT NULL,

  position_start INTEGER NULL,

  position_end INTEGER NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (annotation_type IN ('note', 'highlight', 'evidence'))
);

ALTER TABLE public.research_annotations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_annotations' AND policyname = 'Users can view their own annotations'
  ) THEN
    CREATE POLICY "Users can view their own annotations"
      ON public.research_annotations FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_annotations' AND policyname = 'Users can create their own annotations'
  ) THEN
    CREATE POLICY "Users can create their own annotations"
      ON public.research_annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_annotations' AND policyname = 'Users can update their own annotations'
  ) THEN
    CREATE POLICY "Users can update their own annotations"
      ON public.research_annotations FOR UPDATE
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_annotations' AND policyname = 'Users can delete their own annotations'
  ) THEN
    CREATE POLICY "Users can delete their own annotations"
      ON public.research_annotations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_research_annotations_user_document
  ON public.research_annotations(user_id, research_document_id);

CREATE INDEX IF NOT EXISTS idx_research_annotations_citation
  ON public.research_annotations(user_id, research_document_id, citation_id);

CREATE INDEX IF NOT EXISTS idx_research_annotations_created
  ON public.research_annotations(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- VERIFICATION QUERY
-- Run this after applying to confirm all three tables exist.
-- ────────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('research_documents', 'literature_reviews', 'research_annotations')
ORDER BY tablename;
