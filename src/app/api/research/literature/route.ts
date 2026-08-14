import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';
import { collectAndDeduplicateSources, generateLiteratureReview } from '@/lib/research/literature';

export async function POST(request: Request) {
  console.log('[RESEARCH LITERATURE API] POST request received');

  // 1. Authenticate user via Supabase SSR client
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[RESEARCH LITERATURE API] Auth required');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to create a literature review.',
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

  // 2. Body Payload Validation
  let body: any = null;
  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, 'utf8') > 250 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request payload exceeds 250KB size limit.',
          code: 'PAYLOAD_TOO_LARGE',
        },
        { status: 413 }
      );
    }
    body = JSON.parse(rawText);
  } catch (parseErr) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request payload.',
        code: 'INVALID_PAYLOAD',
      },
      { status: 400 }
    );
  }

  const { researchDocumentIds, researchQuestion, scope = 'comparative', maxSources = 12 } = body || {};

  if (!Array.isArray(researchDocumentIds) || researchDocumentIds.length < 2) {
    return NextResponse.json(
      {
        success: false,
        error: 'At least 2 saved research investigations are required to build a literature review.',
        code: 'MIN_DOCUMENTS_REQUIRED',
      },
      { status: 400 }
    );
  }

  if (researchDocumentIds.length > 6) {
    return NextResponse.json(
      {
        success: false,
        error: 'A maximum of 6 research investigations can be selected at once.',
        code: 'MAX_DOCUMENTS_EXCEEDED',
      },
      { status: 400 }
    );
  }

  // 3. User Ownership Validation (Verify every researchDocumentId belongs to auth.uid())
  const { data: rawDocs, error: fetchErr } = await supabase
    .from('research_documents')
    .select('id, title, query, brief')
    .eq('user_id', user.id)
    .in('id', researchDocumentIds);

  if (fetchErr || !rawDocs || rawDocs.length !== researchDocumentIds.length) {
    console.warn('[RESEARCH LITERATURE API] Ownership validation failed');
    return NextResponse.json(
      {
        success: false,
        error: 'One or more selected research documents were not found or do not belong to you.',
        code: 'UNAUTHORIZED_DOCUMENTS',
      },
      { status: 404 }
    );
  }

  // 4. Source Collection & Deduplication (Max 12 sources)
  const briefs = rawDocs.map((d: any) => d.brief).filter(Boolean);
  const deduplicatedSources = collectAndDeduplicateSources(briefs, Math.min(12, maxSources));

  if (deduplicatedSources.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'No valid citations found in the selected research investigations.',
        code: 'NO_SOURCES_FOUND',
      },
      { status: 400 }
    );
  }

  // Determine core research question
  const questionToSynthesize =
    researchQuestion && researchQuestion.trim()
      ? researchQuestion.trim()
      : `Comparative Literature Synthesis of ${rawDocs.map((d: any) => d.title).join(', ')}`;

  // 5. AI Synthesis Generation
  try {
    const aiProvider = getAIProvider();
    const review = await generateLiteratureReview({
      sources: deduplicatedSources,
      researchQuestion: questionToSynthesize,
      scope: scope as any,
      aiProvider,
      sourceDocumentIds: researchDocumentIds,
    });

    // 6. Persistence to research_literature_reviews table (best effort, fallback gracefully if table unmigrated)
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('research_literature_reviews')
        .insert({
          user_id: user.id,
          title: review.title,
          research_question: review.researchQuestion,
          scope: review.scope,
          review,
          source_document_ids: researchDocumentIds,
        })
        .select('id')
        .single();

      if (!insertErr && inserted) {
        review.id = inserted.id;
      }
    } catch (dbErr) {
      console.warn('[RESEARCH LITERATURE API] Persistence notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (err: any) {
    console.error('[RESEARCH LITERATURE API] Error during synthesis:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to generate multi-source literature review.',
        code: 'SYNTHESIS_FAILED',
      },
      { status: 500 }
    );
  }
}
