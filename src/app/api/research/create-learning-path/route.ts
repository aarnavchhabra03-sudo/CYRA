import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCurriculumFromResearch, buildResearchContext } from '@/lib/research/curriculum';
import { saveLearningPathCurriculum } from '@/lib/learning/save-learning-path';
import { calculateTitleSimilarity } from '@/lib/search/quality-engine';
import { ResearchBrief } from '@/lib/research/types';

export async function POST(request: Request) {
  console.log('[RESEARCH CREATE-PATH API] Learning path creation request received');

  // 1. Authenticate user via Supabase SSR client
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[RESEARCH CREATE-PATH API] Auth required');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to create a learning path.',
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
        error: 'Invalid JSON payload.',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  const { query, brief } = body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'A valid search query string is required.',
        code: 'INVALID_QUERY',
      },
      { status: 400 }
    );
  }

  if (!brief || !brief.title || !brief.executiveSummary || !Array.isArray(brief.keyFindings)) {
    return NextResponse.json(
      {
        success: false,
        error: 'A valid ResearchBrief object is required.',
        code: 'INVALID_BRIEF',
      },
      { status: 400 }
    );
  }

  const researchBrief = brief as ResearchBrief;
  const context = buildResearchContext(researchBrief);

  // 3. Duplicate Course Detection (Search user's active learning paths)
  try {
    const { data: existingPaths } = await supabase
      .from('learning_paths')
      .select('id, title, status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (existingPaths && existingPaths.length > 0) {
      const match = existingPaths.find((p: any) => {
        const sim = calculateTitleSimilarity(p.title, context.topic);
        return sim > 0.70 || p.title.toLowerCase().includes(context.topic.toLowerCase());
      });

      if (match) {
        console.log(`[RESEARCH CREATE-PATH API] Duplicate active path detected: ${match.id} ("${match.title}")`);
        return NextResponse.json({
          success: true,
          existingPath: true,
          learningPathId: match.id,
          message: 'CYRA already has a learning path covering this topic.',
        });
      }
    }
  } catch (dupErr) {
    console.warn('[RESEARCH CREATE-PATH API] Duplicate check warning:', dupErr);
  }

  // 4. Generate Structured Curriculum from Research Brief
  const curriculumResult = await generateCurriculumFromResearch(researchBrief);

  if (!curriculumResult.success || !curriculumResult.data) {
    return NextResponse.json(
      {
        success: false,
        error: curriculumResult.error || 'Failed to generate curriculum from research brief.',
        code: curriculumResult.code || 'GENERATION_FAILED',
      },
      { status: 500 }
    );
  }

  // 5. Persist Curriculum using Shared Server Persistence Function
  const saveResult = await saveLearningPathCurriculum({
    supabase,
    userId: user.id,
    curriculum: curriculumResult.data,
    goal: context.goal,
    experienceLevel: 'intermediate',
    minutesPerDay: 30,
  });

  if (!saveResult.success || !saveResult.learningPathId) {
    return NextResponse.json(
      {
        success: false,
        error: saveResult.error || 'Failed to save research learning path.',
        code: saveResult.code || 'SAVE_FAILED',
      },
      { status: 500 }
    );
  }

  console.log(`[RESEARCH CREATE-PATH API] Successfully created Research Learning Path ID: ${saveResult.learningPathId}`);

  // Link learning_path_id to corresponding research_document if documentId or query matches
  try {
    const documentId = body?.documentId;
    if (documentId && typeof documentId === 'string') {
      await supabase
        .from('research_documents')
        .update({ learning_path_id: saveResult.learningPathId, updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('research_documents')
        .update({ learning_path_id: saveResult.learningPathId, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('query', query.trim());
    }
  } catch (linkErr) {
    console.warn('[RESEARCH CREATE-PATH API] Non-critical document link warning:', linkErr);
  }

  return NextResponse.json({
    success: true,
    existingPath: false,
    learningPathId: saveResult.learningPathId,
  });
}
