import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateResearchBriefForPersistence } from '@/lib/research/persistence';

export async function POST(request: Request) {
  console.log('[RESEARCH SAVED API] Save request received');

  // 1. Authenticate user via Supabase SSR
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[RESEARCH SAVED API] Auth failed');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to save research.',
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

  // 2. Parse & Validate Payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request payload.',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  const { query, brief, intent } = body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'A valid research query string is required.',
        code: 'INVALID_QUERY',
      },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || trimmedQuery.length > 500) {
    return NextResponse.json(
      {
        success: false,
        error: 'Query string must be between 2 and 500 characters.',
        code: 'INVALID_QUERY_LENGTH',
      },
      { status: 400 }
    );
  }

  // 3. Validate Research Brief
  const valResult = validateResearchBriefForPersistence(brief);
  if (!valResult.valid || !valResult.sanitizedBrief) {
    return NextResponse.json(
      {
        success: false,
        error: valResult.error || 'Invalid ResearchBrief structure.',
        code: 'INVALID_BRIEF',
      },
      { status: 400 }
    );
  }

  const sanitizedBrief = valResult.sanitizedBrief;
  const docIntent = typeof intent === 'string' && intent.trim() ? intent.trim() : 'general';

  // 4. Duplicate Check by user.id & query
  try {
    const { data: existingDoc } = await supabase
      .from('research_documents')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('query', trimmedQuery)
      .single();

    if (existingDoc) {
      console.log(`[RESEARCH SAVED API] Document already saved for query "${trimmedQuery}" (ID: ${existingDoc.id})`);

      // Touch updated_at
      await supabase
        .from('research_documents')
        .update({
          updated_at: new Date().toISOString(),
          brief: sanitizedBrief,
        })
        .eq('id', existingDoc.id)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        alreadySaved: true,
        documentId: existingDoc.id,
      });
    }

    // 5. Insert new research document
    const { data: insertedDoc, error: insertErr } = await supabase
      .from('research_documents')
      .insert({
        user_id: user.id, // Derived strictly from server auth session
        title: sanitizedBrief.title,
        query: trimmedQuery,
        intent: docIntent,
        brief: sanitizedBrief,
      })
      .select('id')
      .single();

    if (insertErr || !insertedDoc) {
      console.error('[RESEARCH SAVED API] Database insert error:', insertErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save research document into database.',
          code: 'SAVE_FAILED',
        },
        { status: 500 }
      );
    }

    console.log(`[RESEARCH SAVED API] Successfully saved research document ID: ${insertedDoc.id}`);

    return NextResponse.json({
      success: true,
      alreadySaved: false,
      documentId: insertedDoc.id,
    });
  } catch (err: any) {
    console.error('[RESEARCH SAVED API] Save exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while saving the research document.',
        code: 'SAVE_FAILED',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  console.log('[RESEARCH SAVED API] List request received');

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
          error: 'Authentication required to view research library.',
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

  // 2. Parse Pagination Parameters
  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);

  const limit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

  // 3. Query authenticated user's documents
  try {
    const { data: documents, error: selectErr, count } = await supabase
      .from('research_documents')
      .select('id, user_id, title, query, intent, brief, learning_path_id, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (selectErr) {
      if (selectErr.code === 'PGRST205') {
        console.error(
          '[RESEARCH SAVED API] SCHEMA CACHE ERROR — research_documents table not found.',
          'Apply supabase/stage14_consolidated_migration.sql in your Supabase SQL Editor.',
          selectErr
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Research Library is not yet set up. Please apply the database migration.',
            code: 'MIGRATION_REQUIRED',
          },
          { status: 503 }
        );
      }
      console.error('[RESEARCH SAVED API] List database select error:', selectErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load research library documents.',
          code: 'FETCH_FAILED',
        },
        { status: 500 }
      );
    }

    // 4. Batch query learning status for linked learning paths (Avoid N+1 queries)
    const pathIds = Array.from(
      new Set(
        (documents || [])
          .map((d: any) => d.learning_path_id)
          .filter((id: any) => typeof id === 'string' && id.length > 0)
      )
    );

    const learningStatusMap = new Map<string, any>();

    if (pathIds.length > 0) {
      try {
        const { data: paths } = await supabase
          .from('learning_paths')
          .select('id, title, updated_at')
          .in('id', pathIds)
          .eq('user_id', user.id);

        if (paths && paths.length > 0) {
          const validPathIds = paths.map((p: any) => p.id);
          const pathTitleMap = new Map(paths.map((p: any) => [p.id, p.title]));
          const pathUpdatedMap = new Map(paths.map((p: any) => [p.id, p.updated_at]));

          const { data: modules } = await supabase
            .from('modules')
            .select('id, learning_path_id, lessons(id)')
            .in('learning_path_id', validPathIds);

          const pathLessonsMap = new Map<string, string[]>();
          (modules || []).forEach((m: any) => {
            const pId = m.learning_path_id;
            const lessonIds = (m.lessons || []).map((l: any) => l.id);
            const existing = pathLessonsMap.get(pId) || [];
            pathLessonsMap.set(pId, [...existing, ...lessonIds]);
          });

          const allLessonIds = Array.from(new Set(Array.from(pathLessonsMap.values()).flat()));
          const { data: progressRows } = allLessonIds.length > 0
            ? await supabase
                .from('user_progress')
                .select('lesson_id, is_completed, updated_at')
                .eq('user_id', user.id)
                .in('lesson_id', allLessonIds)
            : { data: [] };

          const completedLessonSet = new Set(
            (progressRows || []).filter((pr: any) => pr.is_completed).map((pr: any) => pr.lesson_id)
          );

          const { data: masteryRows } = await supabase
            .from('user_concept_mastery')
            .select('mastery_score, review_needed')
            .eq('user_id', user.id);

          const hasDecay = (masteryRows || []).some((m: any) => m.review_needed || m.mastery_score < 60);

          validPathIds.forEach((pId: string) => {
            const lessonIds = pathLessonsMap.get(pId) || [];
            const totalLessons = lessonIds.length;
            const completedLessons = lessonIds.filter((lId) => completedLessonSet.has(lId)).length;
            const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            learningStatusMap.set(pId, {
              learningPathId: pId,
              learningPathTitle: pathTitleMap.get(pId) || 'Learning Path',
              totalLessons,
              completedLessons,
              progressPercent,
              hasDecay,
              lastActivityAt: pathUpdatedMap.get(pId) || null,
            });
          });
        }
      } catch (statusErr) {
        console.warn('[RESEARCH SAVED API] Non-critical learning status warning:', statusErr);
      }
    }

    const docIds = (documents || []).map((d: any) => d.id);
    const annotationCountMap = new Map<string, number>();

    if (docIds.length > 0) {
      try {
        const { data: annotationRows } = await supabase
          .from('research_annotations')
          .select('research_document_id')
          .eq('user_id', user.id)
          .in('research_document_id', docIds);

        (annotationRows || []).forEach((row: any) => {
          const docId = row.research_document_id;
          annotationCountMap.set(docId, (annotationCountMap.get(docId) || 0) + 1);
        });
      } catch (annErr) {
        console.warn('[RESEARCH SAVED API] Non-critical annotation count warning:', annErr);
      }
    }

    const formattedDocs = (documents || []).map((doc: any) => ({
      id: doc.id,
      userId: doc.user_id,
      title: doc.title,
      query: doc.query,
      intent: doc.intent,
      brief: doc.brief,
      learningPathId: doc.learning_path_id,
      learningStatus: doc.learning_path_id ? learningStatusMap.get(doc.learning_path_id) || null : null,
      annotationCount: annotationCountMap.get(doc.id) || 0,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedDocs,
      totalCount: count || formattedDocs.length,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[RESEARCH SAVED API] List exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected database error occurred.',
        code: 'FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
