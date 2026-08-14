import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { serializeDbKnowledgeMap } from '../../route';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[KNOWLEDGE MAP REJECT API] POST rejection request for map ID: ${id}`);

  // 1. Validate Map ID UUID Format
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

  // 3. Fetch Owned Map strictly by ID AND user_id
  const { data: mapRow, error: fetchErr } = await adminClient
    .from('research_knowledge_maps')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !mapRow) {
    console.warn(`[KNOWLEDGE MAP REJECT API] Knowledge map not found or unowned: ${id}`);
    return NextResponse.json(
      {
        success: false,
        error: 'Knowledge map not found',
        code: 'NOT_FOUND',
      },
      { status: 404 }
    );
  }

  // 4. Status Transition Check
  if (mapRow.status === 'approved') {
    return NextResponse.json(
      {
        success: false,
        error: 'Approved knowledge maps cannot be rejected',
        code: 'MAP_ALREADY_APPROVED',
      },
      { status: 400 }
    );
  }

  if (mapRow.status === 'rejected') {
    return NextResponse.json(
      {
        success: false,
        error: 'Knowledge map is already rejected',
        code: 'MAP_ALREADY_REJECTED',
      },
      { status: 400 }
    );
  }

  if (mapRow.status !== 'pending') {
    return NextResponse.json(
      {
        success: false,
        error: 'Knowledge map is not pending rejection',
        code: 'MAP_NOT_PENDING',
      },
      { status: 400 }
    );
  }

  // 5. Update Map Lifecycle State to rejected
  const nowTimestamp = new Date().toISOString();

  const { data: updatedMapRow, error: updateErr } = await adminClient
    .from('research_knowledge_maps')
    .update({
      status: 'rejected',
      approved_at: null,
      updated_at: nowTimestamp,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (updateErr || !updatedMapRow) {
    console.error('[KNOWLEDGE MAP REJECT API] Map rejection update error:', updateErr);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject knowledge map.',
        code: 'REJECTION_FAILED',
      },
      { status: 500 }
    );
  }

  const serializedMap = serializeDbKnowledgeMap(updatedMapRow);

  return NextResponse.json(
    {
      success: true,
      data: serializedMap,
    },
    { status: 200 }
  );
}
