import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateAnnotationInput } from '@/lib/research/annotations';

// POST /api/research/annotations — Create a personal research annotation
export async function POST(request: Request) {
  console.log('[RESEARCH ANNOTATIONS API] POST create annotation request');

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

  // 2. Parse & Validate Payload
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

  const { valid, errors, normalized } = validateAnnotationInput(body);
  if (!valid || !normalized) {
    return NextResponse.json(
      { success: false, error: errors.join(' '), code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  // 3. Ownership Verification of target Research Document
  const { data: rawDoc, error: docErr } = await supabase
    .from('research_documents')
    .select('id')
    .eq('id', normalized.researchDocumentId)
    .eq('user_id', user.id)
    .single();

  if (docErr || !rawDoc) {
    return NextResponse.json(
      { success: false, error: 'Research document not found.', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // 4. Max 100 Annotations per document check
  const { count: currentCount } = await supabase
    .from('research_annotations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('research_document_id', normalized.researchDocumentId);

  if (currentCount && currentCount >= 100) {
    return NextResponse.json(
      {
        success: false,
        error: 'Maximum limit of 100 annotations per research document reached.',
        code: 'LIMIT_EXCEEDED',
      },
      { status: 400 }
    );
  }

  // 5. Duplicate Detection (within recent 60s window)
  const recentWindow = new Date(Date.now() - 60000).toISOString();
  const { data: existingDupes } = await supabase
    .from('research_annotations')
    .select('*')
    .eq('user_id', user.id)
    .eq('research_document_id', normalized.researchDocumentId)
    .eq('note', normalized.note)
    .gte('created_at', recentWindow)
    .limit(1);

  if (existingDupes && existingDupes.length > 0) {
    const existing = existingDupes[0];
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      data: {
        id: existing.id,
        userId: existing.user_id,
        researchDocumentId: existing.research_document_id,
        citationId: existing.citation_id,
        annotationType: existing.annotation_type,
        selectedText: existing.selected_text,
        note: existing.note,
        sourceUrl: existing.source_url,
        sourceTitle: existing.source_title,
        positionStart: existing.position_start,
        positionEnd: existing.position_end,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      },
    });
  }

  // 6. Insert Row into research_annotations
  const { data: created, error: insertErr } = await supabase
    .from('research_annotations')
    .insert({
      user_id: user.id,
      research_document_id: normalized.researchDocumentId,
      citation_id: normalized.citationId,
      annotation_type: normalized.annotationType,
      selected_text: normalized.selectedText,
      note: normalized.note,
      source_url: normalized.sourceUrl,
      source_title: normalized.sourceTitle,
      position_start: normalized.positionStart,
      position_end: normalized.positionEnd,
    })
    .select('*')
    .single();

  if (insertErr || !created) {
    console.error('[RESEARCH ANNOTATIONS API] Insert error:', insertErr);
    return NextResponse.json(
      { success: false, error: 'Failed to save annotation.', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: created.id,
      userId: created.user_id,
      researchDocumentId: created.research_document_id,
      citationId: created.citation_id,
      annotationType: created.annotation_type,
      selectedText: created.selected_text,
      note: created.note,
      sourceUrl: created.source_url,
      sourceTitle: created.source_title,
      positionStart: created.position_start,
      positionEnd: created.position_end,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    },
  });
}

// GET /api/research/annotations?documentId=... — Fetch annotations for document
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json(
      { success: false, error: 'documentId parameter is required.', code: 'MISSING_PARAM' },
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

  // 2. Ownership Verification
  const { data: rawDoc } = await supabase
    .from('research_documents')
    .select('id')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (!rawDoc) {
    return NextResponse.json(
      { success: false, error: 'Research document not found.', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // 3. Fetch Annotations (max 100)
  const { data: rows, error: fetchErr } = await supabase
    .from('research_annotations')
    .select('*')
    .eq('user_id', user.id)
    .eq('research_document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (fetchErr) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch annotations.', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }

  const mapped = (rows || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    researchDocumentId: r.research_document_id,
    citationId: r.citation_id,
    annotationType: r.annotation_type,
    selectedText: r.selected_text,
    note: r.note,
    sourceUrl: r.source_url,
    sourceTitle: r.source_title,
    positionStart: r.position_start,
    positionEnd: r.position_end,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({
    success: true,
    data: mapped,
    count: mapped.length,
  });
}
