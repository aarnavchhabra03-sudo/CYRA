-- ============================================================
-- CYRA.AI — STAGE 14.6.1
-- ATOMIC KNOWLEDGE MAP APPROVAL MIGRATION
-- ============================================================
-- Purpose:
--   Provides a single atomic PL/pgSQL function to merge approved concept
--   relationships into public.concept_relationships AND transition the map
--   status in public.research_knowledge_maps to 'approved' within a single
--   PostgreSQL transaction boundary.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_research_knowledge_map(
  p_map_id UUID,
  p_user_id UUID,
  p_relationships JSONB,
  p_updated_nodes JSONB,
  p_updated_edges JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rel RECORD;
  v_updated_row JSONB;
  v_valid_types CONSTANT text[] := ARRAY['prerequisite', 'related', 'builds_on', 'application_of'];
  v_source_concept TEXT;
  v_target_concept TEXT;
  v_rel_type TEXT;
  v_strength INT;
BEGIN
  -- 1. Lock pending knowledge map row for update and verify ownership & pending status
  IF NOT EXISTS (
    SELECT 1 FROM public.research_knowledge_maps
    WHERE id = p_map_id AND user_id = p_user_id AND status = 'pending'
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'MAP_NOT_PENDING_OR_NOT_FOUND';
  END IF;

  -- 2. Validate and insert relationships into concept_relationships if provided
  IF p_relationships IS NOT NULL AND jsonb_array_length(p_relationships) > 0 THEN
    FOR v_rel IN SELECT * FROM jsonb_to_recordset(p_relationships) AS x(
      source_concept TEXT,
      target_concept TEXT,
      relationship_type TEXT,
      strength INT
    )
    LOOP
      v_source_concept := TRIM(COALESCE(v_rel.source_concept, ''));
      v_target_concept := TRIM(COALESCE(v_rel.target_concept, ''));
      v_rel_type := LOWER(TRIM(COALESCE(v_rel.relationship_type, '')));
      v_strength := v_rel.strength;

      -- Fail closed validation rules
      IF v_source_concept = '' OR v_target_concept = '' THEN
        RAISE EXCEPTION 'EMPTY_RELATIONSHIP_CONCEPT';
      END IF;

      IF NOT (v_rel_type = ANY(v_valid_types)) THEN
        RAISE EXCEPTION 'INVALID_RELATIONSHIP_TYPE';
      END IF;

      IF v_strength IS NULL OR v_strength < 0 OR v_strength > 100 THEN
        RAISE EXCEPTION 'INVALID_RELATIONSHIP_STRENGTH';
      END IF;

      -- Upsert concept relationship
      INSERT INTO public.concept_relationships (
        user_id,
        source_concept,
        target_concept,
        relationship_type,
        strength,
        source_lesson_id,
        target_lesson_id
      ) VALUES (
        p_user_id,
        v_source_concept,
        v_target_concept,
        v_rel_type,
        v_strength,
        NULL,
        NULL
      )
      ON CONFLICT (user_id, source_concept, target_concept, relationship_type)
      DO UPDATE SET
        strength = EXCLUDED.strength;
    END LOOP;
  END IF;

  -- 3. Update research_knowledge_maps status to approved
  UPDATE public.research_knowledge_maps
  SET
    status = 'approved',
    nodes = p_updated_nodes,
    edges = p_updated_edges,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_map_id AND user_id = p_user_id AND status = 'pending'
  RETURNING to_jsonb(research_knowledge_maps.*) INTO v_updated_row;

  IF v_updated_row IS NULL THEN
    RAISE EXCEPTION 'APPROVAL_UPDATE_FAILED';
  END IF;

  RETURN v_updated_row;
END;
$$;

-- Security & Privileges
REVOKE EXECUTE ON FUNCTION public.approve_research_knowledge_map(UUID, UUID, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_research_knowledge_map(UUID, UUID, JSONB, JSONB, JSONB) TO service_role;

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
