-- Stage 14.5 Supabase Migration: Personal Research Notes & Citation Annotations
-- Creates public.research_annotations table, indexes, and strict multi-tenant RLS policies.

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

  CHECK (
    annotation_type IN ('note', 'highlight', 'evidence')
  )
);

-- Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_research_annotations_user_document
  ON public.research_annotations(user_id, research_document_id);

CREATE INDEX IF NOT EXISTS idx_research_annotations_citation
  ON public.research_annotations(user_id, research_document_id, citation_id);

CREATE INDEX IF NOT EXISTS idx_research_annotations_created
  ON public.research_annotations(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.research_annotations ENABLE ROW LEVEL SECURITY;

-- Multi-tenant Security RLS Policies (Strict auth.uid() enforcement)
CREATE POLICY "Users can view their own annotations"
  ON public.research_annotations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own annotations"
  ON public.research_annotations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
  ON public.research_annotations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
  ON public.research_annotations
  FOR DELETE
  USING (auth.uid() = user_id);
