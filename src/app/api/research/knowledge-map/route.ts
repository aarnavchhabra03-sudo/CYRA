import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractConceptCandidates,
  processKnowledgeNodes,
  proposeKnowledgeEdges,
  savePendingKnowledgeMap,
  MasteryRecordInput,
} from '@/lib/research/knowledge-map';
import { getLearningPathConcepts } from '@/lib/adaptive/knowledge-graph';
import { ResearchBrief, ResearchKnowledgeMap } from '@/lib/research/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function serializeDbKnowledgeMap(row: any): ResearchKnowledgeMap {
  if (!row) throw new Error('Knowledge map row is null or undefined');

  const nodes = Array.isArray(row.nodes) ? row.nodes : [];
  const edges = Array.isArray(row.edges) ? row.edges : [];

  return {
    id: row.id,
    userId: row.user_id,
    researchDocumentId: row.research_document_id,
    title: row.title || 'Research Knowledge Map',
    status: row.status,
    nodes,
    edges,
    approvedAt: row.approved_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: Request) {
  console.log('[KNOWLEDGE MAP API] POST propose request received');

  // 1. Authenticate User Session
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[KNOWLEDGE MAP API] Auth required');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // 2. Parse & Validate Payload Body
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request payload.',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  const { researchDocumentId } = body || {};

  if (!researchDocumentId || typeof researchDocumentId !== 'string' || !UUID_REGEX.test(researchDocumentId)) {
    return NextResponse.json(
      {
        success: false,
        error: 'A valid researchDocumentId UUID is required.',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // 3. Ownership Scoped Research Document Lookup
  const { data: docRow, error: docErr } = await supabase
    .from('research_documents')
    .select('id, user_id, title, brief, learning_path_id')
    .eq('id', researchDocumentId)
    .eq('user_id', user.id)
    .single();

  if (docErr || !docRow) {
    console.warn(`[KNOWLEDGE MAP API] Research document not found or unowned: ${researchDocumentId}`);
    return NextResponse.json(
      {
        success: false,
        error: 'Research document not found',
        code: 'NOT_FOUND',
      },
      { status: 404 }
    );
  }

  // 4. Check Existing Knowledge Map Status (Conflict Protection for Approved Maps)
  const { data: existingMap } = await supabase
    .from('research_knowledge_maps')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('research_document_id', researchDocumentId)
    .maybeSingle();

  if (existingMap && existingMap.status === 'approved') {
    return NextResponse.json(
      {
        success: false,
        error: 'An approved knowledge map already exists for this research document',
        code: 'MAP_ALREADY_APPROVED',
      },
      { status: 409 }
    );
  }

  // 5. Parse Research Brief
  let brief: ResearchBrief;
  try {
    brief = typeof docRow.brief === 'string' ? JSON.parse(docRow.brief) : docRow.brief;
    if (!brief || typeof brief !== 'object') throw new Error('Invalid brief structure');
  } catch (parseErr) {
    console.error('[KNOWLEDGE MAP API] Failed to parse research brief JSON:', parseErr);
    return NextResponse.json(
      {
        success: false,
        error: 'Stored research document brief is invalid or corrupted.',
        code: 'GENERATION_FAILED',
      },
      { status: 500 }
    );
  }

  // 6. Fetch User Concept Pool & Mastery Records for Enrichment (READ ONLY)
  const conceptPoolSet = new Set<string>();
  const masteryRecords: MasteryRecordInput[] = [];

  try {
    // A. Fetch concept mastery records
    const { data: ucmRows } = await supabase
      .from('user_concept_mastery')
      .select('concept, mastery_score, questions_attempted, last_reviewed_at')
      .eq('user_id', user.id);

    if (ucmRows) {
      for (const row of ucmRows) {
        if (row.concept) {
          conceptPoolSet.add(row.concept.trim());
          masteryRecords.push({
            concept: row.concept.trim(),
            masteryScore: row.mastery_score ?? 0,
            questionsAttempted: row.questions_attempted ?? 0,
            lastReviewedAt: row.last_reviewed_at,
          });
        }
      }
    }

    // B. Fetch active learning path concepts if linked
    if (docRow.learning_path_id) {
      const lpConcepts = await getLearningPathConcepts(docRow.learning_path_id);
      for (const c of lpConcepts) {
        conceptPoolSet.add(c);
      }
    }
  } catch (poolErr) {
    console.warn('[KNOWLEDGE MAP API] Error assembling concept pool, continuing with extracted concepts:', poolErr);
  }

  // 7. Invoke Engine Pipeline
  try {
    const candidates = extractConceptCandidates(brief);
    const nodes = processKnowledgeNodes({
      candidates,
      existingConcepts: Array.from(conceptPoolSet),
      masteryRecords,
    });
    const edges = await proposeKnowledgeEdges({ brief, nodes });

    // 8. Persist Pending Map
    const saveResult = await savePendingKnowledgeMap({
      userId: user.id,
      researchDocumentId,
      title: docRow.title || brief.title || 'Research Knowledge Map',
      nodes,
      edges,
    });

    if (!saveResult.success || !saveResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: saveResult.error || 'Failed to persist knowledge map',
          code: 'PERSISTENCE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: saveResult.data,
      },
      { status: 201 }
    );
  } catch (genErr: any) {
    console.error('[KNOWLEDGE MAP API] Generation exception:', genErr);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate research knowledge map.',
        code: 'GENERATION_FAILED',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  console.log('[KNOWLEDGE MAP API] GET request received');

  // 1. Authenticate User Session
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // 2. Query Parameter Scoping
  const url = new URL(request.url);
  const researchDocumentId = url.searchParams.get('researchDocumentId');

  try {
    if (researchDocumentId) {
      if (!UUID_REGEX.test(researchDocumentId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid researchDocumentId UUID query parameter.',
            code: 'INVALID_REQUEST',
          },
          { status: 400 }
        );
      }

      const { data: mapRow, error: mapErr } = await supabase
        .from('research_knowledge_maps')
        .select('id, user_id, research_document_id, title, status, nodes, edges, approved_at, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('research_document_id', researchDocumentId)
        .maybeSingle();

      if (mapErr) {
        console.error('[KNOWLEDGE MAP API] Query error for researchDocumentId:', mapErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to retrieve knowledge map.',
            code: 'RETRIEVAL_FAILED',
          },
          { status: 500 }
        );
      }

      if (!mapRow) {
        return NextResponse.json(
          {
            success: true,
            data: null,
          },
          { status: 200 }
        );
      }

      const serializedMap = serializeDbKnowledgeMap(mapRow);
      return NextResponse.json(
        {
          success: true,
          data: serializedMap,
        },
        { status: 200 }
      );
    } else {
      // List all maps owned by authenticated user
      const { data: mapRows, error: listErr } = await supabase
        .from('research_knowledge_maps')
        .select('id, user_id, research_document_id, title, status, nodes, edges, approved_at, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listErr) {
        console.error('[KNOWLEDGE MAP API] List query error:', listErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to retrieve knowledge maps list.',
            code: 'RETRIEVAL_FAILED',
          },
          { status: 500 }
        );
      }

      const serializedMaps = (mapRows || []).map(serializeDbKnowledgeMap);
      return NextResponse.json(
        {
          success: true,
          data: serializedMaps,
        },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error('[KNOWLEDGE MAP API] GET exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal error occurred retrieving knowledge map(s).',
        code: 'RETRIEVAL_FAILED',
      },
      { status: 500 }
    );
  }
}
