import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[RESEARCH SAVED ID API] GET request for document ID: ${id}`);

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid document ID.',
        code: 'INVALID_ID',
      },
      { status: 400 }
    );
  }

  // 1. Authenticate user
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED',
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
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Query document scoped strictly by ID AND user_id
  try {
    const { data: doc, error: selectErr } = await supabase
      .from('research_documents')
      .select('id, user_id, title, query, intent, brief, learning_path_id, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (selectErr || !doc) {
      console.warn(`[RESEARCH SAVED ID API] Document ${id} not found or unauthorized for user ${user.id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Research document not found.',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const formattedDoc = {
      id: doc.id,
      userId: doc.user_id,
      title: doc.title,
      query: doc.query,
      intent: doc.intent,
      brief: doc.brief,
      learningPathId: doc.learning_path_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: formattedDoc,
    });
  } catch (err: any) {
    console.error(`[RESEARCH SAVED ID API] Exception for ${id}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load research document.',
        code: 'FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[RESEARCH SAVED ID API] DELETE request for document ID: ${id}`);

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid document ID.',
        code: 'INVALID_ID',
      },
      { status: 400 }
    );
  }

  // 1. Authenticate user
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED',
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
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Delete document scoped strictly by ID AND user_id (preserves linked learning_paths)
  try {
    const { error: deleteErr } = await supabase
      .from('research_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteErr) {
      console.error(`[RESEARCH SAVED ID API] Delete database error for ${id}:`, deleteErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete research document.',
          code: 'DELETE_FAILED',
        },
        { status: 500 }
      );
    }

    console.log(`[RESEARCH SAVED ID API] Successfully deleted document ${id} for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Research document deleted successfully.',
    });
  } catch (err: any) {
    console.error(`[RESEARCH SAVED ID API] Delete exception for ${id}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while deleting the research document.',
        code: 'DELETE_FAILED',
      },
      { status: 500 }
    );
  }
}
