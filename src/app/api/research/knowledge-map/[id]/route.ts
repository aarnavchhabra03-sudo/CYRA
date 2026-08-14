import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serializeDbKnowledgeMap } from '../route';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[KNOWLEDGE MAP ID API] GET request for map ID: ${id}`);

  // 1. Validate ID Param
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid knowledge map ID.',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // 2. Authenticate User Session
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

  // 3. Query Knowledge Map Scoped Strictly by ID AND user_id
  try {
    const { data: mapRow, error: selectErr } = await supabase
      .from('research_knowledge_maps')
      .select('id, user_id, research_document_id, title, status, nodes, edges, approved_at, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (selectErr || !mapRow) {
      console.warn(`[KNOWLEDGE MAP ID API] Map not found or unowned: ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Knowledge map not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // 4. JSONB Array Integrity Validation
    if (!Array.isArray(mapRow.nodes) || !Array.isArray(mapRow.edges)) {
      console.error(`[KNOWLEDGE MAP ID API] Corrupted map JSONB data for map ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Knowledge map data is corrupted or malformed.',
          code: 'CORRUPTED_DATA',
        },
        { status: 500 }
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
  } catch (err: any) {
    console.error(`[KNOWLEDGE MAP ID API] GET exception for map ${id}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal error occurred retrieving the knowledge map.',
        code: 'RETRIEVAL_FAILED',
      },
      { status: 500 }
    );
  }
}
