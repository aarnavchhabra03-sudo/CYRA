import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveLearningPathCurriculum } from '@/lib/learning/save-learning-path';
import { LearningPathGeneration } from '@/types/ai';

export async function POST(request: Request) {
  console.log('[save-learning-path API] Starting persistence request...');

  // 1. Authenticate user using Supabase SSR client
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[save-learning-path API] Auth failed:', authError?.message || 'No user session');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please sign in to save learning paths.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err: any) {
    console.error('[save-learning-path API] Session verification error:', err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Parse & Validate JSON Payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request body.',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  const { curriculum, experienceLevel, goal, minutesPerDay } = body || {};

  if (!curriculum || !curriculum.title || !Array.isArray(curriculum.modules) || curriculum.modules.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid curriculum data supplied.',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  // 3. Delegate to shared persistence function
  const saveResult = await saveLearningPathCurriculum({
    supabase,
    userId: user.id,
    curriculum: curriculum as LearningPathGeneration,
    goal,
    experienceLevel,
    minutesPerDay,
  });

  if (!saveResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: saveResult.error || 'Failed to save learning path.',
        code: saveResult.code || 'SAVE_FAILED',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    learningPathId: saveResult.learningPathId,
  });
}
