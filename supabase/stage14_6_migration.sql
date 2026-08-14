-- ============================================================
-- CYRA.AI — STAGE 14.6
-- RESEARCH KNOWLEDGE MAP DATABASE MIGRATION (SECURITY HARDENED)
-- ============================================================
-- Purpose:
--   Creates the public.research_knowledge_maps staging table for
--   storing candidate concept maps extracted from saved Research Briefs.
--   Enables interactive user review and explicit approval before
--   edges are committed into public.concept_relationships.
--
-- Ownership & Scope:
--   - Foreign key to auth.users(id) with CASCADE deletion.
--   - Foreign key to public.research_documents(id) with CASCADE deletion.
--   - Strict multi-tenant Row Level Security (RLS) policies based on auth.uid().
--
-- Security Model & Anti-Self-Approval Enforcement:
--   - Client-side status escalation (pending -> approved OR rejected -> approved)
--     is STRICTLY PREVENTED via RLS WITH CHECK (status <> 'approved').
--   - Authenticated clients can SELECT their own maps, INSERT pending maps,
--     UPDATE node/edge review selections, transition pending -> rejected, or
--     reset rejected -> pending for regeneration.
--   - Status transition to 'approved' can ONLY occur through the secure, server-side
--     validated approval endpoint (/api/research/knowledge-map/[id]/approve) which
--     uses adminClient (Supabase Service Role Key) to bypass RLS after graph merge.
--
-- Status Lifecycle & Invariants:
--   - 'pending': Map generated; awaiting user review. approved_at MUST be NULL.
--   - 'approved': Map reviewed & merged into concept_relationships. approved_at MUST NOT be NULL.
--   - 'rejected': Map rejected by user. approved_at MUST be NULL.
--
-- Regeneration Behavior:
--   - UNIQUE(user_id, research_document_id) ensures one active knowledge map per research document.
--   - When a map is in 'rejected' state, regenerating the map resets/reuses the existing row
--     back to 'pending' with updated nodes and edges, resetting approved_at to NULL.
--   - Approved maps CANNOT be silently overwritten or modified by client updates.
--
-- JSONB Structure Documentation:
--   - nodes (JSONB Array):
--       [
--         {
--           "id": "node-1",
--           "label": "TCP Congestion Control",
--           "normalizedLabel": "tcp congestion control",
--           "nodeType": "matched_concept",        -- 'existing_concept' | 'new_concept' | 'matched_concept'
--           "matchStatus": "exact_match",          -- 'exact_match' | 'fuzzy_match' | 'unmatched'
--           "matchedExistingConcept": "TCP Congestion",
--           "confidence": 95,
--           "evidence": "Source explanation snippet...",
--           "citationIds": ["citation-1"],
--           "masteryScore": 75,
--           "effectiveMasteryScore": 71,
--           "isApproved": true
--         }
--       ]
--   - edges (JSONB Array):
--       [
--         {
--           "id": "edge-1",
--           "sourceNodeId": "node-1",
--           "targetNodeId": "node-2",
--           "relationshipType": "prerequisite",     -- 'prerequisite' | 'related' | 'builds_on' | 'application_of'
--           "strength": 85,
--           "confidence": 90,
--           "evidence": "Source finding explanation...",
--           "citationIds": ["citation-1"],
--           "isApproved": true
--         }
--       ]
-- ============================================================

CREATE TABLE IF NOT EXISTS public.research_knowledge_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  research_document_id UUID NOT NULL
    REFERENCES public.research_documents(id)
    ON DELETE CASCADE,

  title TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,

  edges JSONB NOT NULL DEFAULT '[]'::jsonb,

  approved_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one knowledge map per user per research document
  CONSTRAINT uq_research_knowledge_map_user_doc UNIQUE (user_id, research_document_id),

  -- Status Invariants: approved_at must be present iff status is 'approved'
  CONSTRAINT chk_research_knowledge_map_approved_at CHECK (
    (status = 'approved' AND approved_at IS NOT NULL) OR
    (status <> 'approved' AND approved_at IS NULL)
  )
);

-- Indexes for Fast Querying & Scoped Retrieval
CREATE INDEX IF NOT EXISTS idx_research_knowledge_maps_user_doc
  ON public.research_knowledge_maps(user_id, research_document_id);

CREATE INDEX IF NOT EXISTS idx_research_knowledge_maps_user_status
  ON public.research_knowledge_maps(user_id, status);

CREATE INDEX IF NOT EXISTS idx_research_knowledge_maps_user_created
  ON public.research_knowledge_maps(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.research_knowledge_maps ENABLE ROW LEVEL SECURITY;

-- Security Hardened RLS Policies (Idempotent)
DO $$
BEGIN
  -- 1. SELECT Policy: Users can only view their own research knowledge maps
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_knowledge_maps' AND policyname = 'Users can view their own research knowledge maps'
  ) THEN
    CREATE POLICY "Users can view their own research knowledge maps"
      ON public.research_knowledge_maps
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- 2. INSERT Policy: Users can only insert unapproved research knowledge maps for themselves
  --    (Prevents clients from directly creating pre-approved maps)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_knowledge_maps' AND policyname = 'Users can insert their own research knowledge maps'
  ) THEN
    CREATE POLICY "Users can insert their own research knowledge maps"
      ON public.research_knowledge_maps
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        status <> 'approved'
      );
  END IF;

  -- 3. UPDATE Policy: Users can update node/edge selections in pending/rejected state,
  --    or reject/reset pending maps, BUT CANNOT self-approve (status = 'approved' is BLOCKED).
  --    Approval transitions must be performed by the trusted server endpoint via adminClient.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_knowledge_maps' AND policyname = 'Users can update their own research knowledge maps'
  ) THEN
    CREATE POLICY "Users can update their own research knowledge maps"
      ON public.research_knowledge_maps
      FOR UPDATE
      USING (
        auth.uid() = user_id AND
        status <> 'approved'
      )
      WITH CHECK (
        auth.uid() = user_id AND
        status <> 'approved'
      );
  END IF;

  -- 4. DELETE Policy: Users can delete their own research knowledge maps
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'research_knowledge_maps' AND policyname = 'Users can delete their own research knowledge maps'
  ) THEN
    CREATE POLICY "Users can delete their own research knowledge maps"
      ON public.research_knowledge_maps
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
