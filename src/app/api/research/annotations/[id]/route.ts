import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeAnnotationText } from '@/lib/research/annotations';

// PATCH /api/research/annotations/[id] — Update an existing personal annotation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Annotation ID required.', code: 'MISSING_ID' },
      { status: 400 }
    );
  }

  // 1. Authenticate Session
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Failed to verify session.', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // 2. Body Parsing
  let body: any = null;
  try {
    const rawText = await request.text();
    body = JSON.parse(rawText);
  } catch (parseErr) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload.', code: 'INVALID_PAYLOAD' },
      { status: 400 }
    );
  }

  const { note, annotationType, selectedText } = body || {};

  // 3. Ownership Verification
  const { data: existing, error: fetchErr } = await supabase
    .from('research_annotations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json(
      { success: false, error: 'Annotation not found.', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // 4. Prepare Updates
  const updates: any = { updated_at: new Date().toISOString() };

  if (typeof note === 'string') {
    const cleanNote = sanitizeAnnotationText(note);
    if (!cleanNote) {
      return NextResponse.json(
        { success: false, error: 'Note content cannot be empty.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    if (cleanNote.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Note exceeds 5000 character limit.', code: 'LIMIT_EXCEEDED' },
        { status: 400 }
      );
    }
    updates.note = cleanNote;
  }

  if (annotationType && ['note', 'highlight', 'evidence'].includes(annotationType)) {
    updates.annotation_type = annotationType;
  }

  if (typeof selectedText === 'string') {
    const cleanSel = sanitizeAnnotationText(selectedText);
    if (cleanSel.length > 3000) {
      return NextResponse.json(
        { success: false, error: 'Selected text exceeds 3000 character limit.', code: 'LIMIT_EXCEEDED' },
        { status: 400 }
      );
    }
    updates.selected_text = cleanSel;
  }

  // 5. Update Database Row
  const { data: updated, error: updateErr } = await supabase
    .from('research_annotations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { success: false, error: 'Failed to update annotation.', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      userId: updated.user_id,
      researchDocumentId: updated.research_document_id,
      citationId: updated.citation_id,
      annotationType: updated.annotation_type,
      selectedText: updated.selected_text,
      note: updated.note,
      sourceUrl: updated.source_url,
      sourceTitle: updated.source_title,
      positionStart: updated.position_start,
      positionEnd: updated.position_end,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
}

// DELETE /api/research/annotations/[id] — Delete a personal annotation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Annotation ID required.', code: 'MISSING_ID' },
      { status: 400 }
    );
  }

  // 1. Authenticate Session
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Failed to verify session.', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // 2. Ownership Verification & Delete
  const { error: deleteErr } = await supabase
    .from('research_annotations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteErr) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete annotation.', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Annotation deleted successfully.',
  });
}
