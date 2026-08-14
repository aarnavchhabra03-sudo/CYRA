import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';
import { saveLearningPathCurriculum } from '@/lib/learning/save-learning-path';
import { DifficultyLevel } from '@/types/ai';

export async function POST(request: Request) {
  // 1. Authenticate user via Supabase SSR
  let supabase: any;
  let user: any;

  try {
    supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to generate a learning path.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify user authentication session.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Parse & Validate request body
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

  const topic = (body?.topic || '').toString();
  const rawLevel = (body?.experienceLevel || body?.skillLevel || body?.experience_level || 'intermediate').toString().trim().toLowerCase();
  const goal = (body?.goal || 'deep_dive').toString();
  const minutesPerDay = typeof body?.minutesPerDay === 'number' && !isNaN(body.minutesPerDay) ? body.minutesPerDay : 30;
  const targetDate = body?.targetDate;

  // Canonical level contract
  const validLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
  const experienceLevel: DifficultyLevel = validLevels.includes(rawLevel as DifficultyLevel)
    ? (rawLevel as DifficultyLevel)
    : 'intermediate';

  if (
    !topic ||
    topic.trim().length < 2 ||
    topic.trim().length > 500
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Please enter a valid research topic or question (at least 2 characters).',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  // 3. Call AI Provider for Structured Generation
  try {
    const provider = getAIProvider();

    const aiResponse = await provider.generateLearningPath({
      topic: topic.trim(),
      experienceLevel: experienceLevel as DifficultyLevel,
      goal: goal.trim(),
      minutesPerDay,
      targetDate: typeof targetDate === 'string' ? targetDate : undefined,
    });

    if (!aiResponse.success || !aiResponse.data) {
      const code = aiResponse.code;

      if (code === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service rate limit reached. Please try again in a few moments.',
            code: 'AI_RATE_LIMIT',
          },
          { status: 429 }
        );
      }

      if (code === 'MISSING_API_KEY' || code === 'INVALID_API_KEY') {
        return NextResponse.json(
          {
            success: false,
            error: 'AI provider service is currently unavailable.',
            code: 'AI_PROVIDER_UNAVAILABLE',
          },
          { status: 503 }
        );
      }

      if (code === 'VALIDATION_ERROR') {
        console.error('[LEARNING_PATH] Validation failed during AI response generation:', aiResponse.error);
        return NextResponse.json(
          {
            success: false,
            error: "CYRA couldn't generate a valid learning path this time. Please retry.",
            code: 'VALIDATION_ERROR',
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: aiResponse.error || 'Failed to generate a valid learning path curriculum.',
          code: 'AI_GENERATION_FAILED',
        },
        { status: 500 }
      );
    }

    // 4. Persist Learning Path to Database
    const saveResult = await saveLearningPathCurriculum({
      supabase,
      userId: user.id,
      curriculum: aiResponse.data,
      goal: goal.trim(),
      experienceLevel,
      minutesPerDay,
    });

    if (!saveResult.success || !saveResult.learningPathId) {
      return NextResponse.json(
        {
          success: false,
          error: saveResult.error || 'Failed to save research workspace to database.',
          code: saveResult.code || 'SAVE_FAILED',
        },
        { status: 500 }
      );
    }

    // Return persisted learning path to frontend
    return NextResponse.json({
      success: true,
      learningPathId: saveResult.learningPathId,
      learningPath: {
        id: saveResult.learningPathId,
        title: aiResponse.data.title,
        description: aiResponse.data.description,
      },
      data: aiResponse.data,
      provider: aiResponse.provider,
    });
  } catch (error: any) {
    console.error('Unhandled learning path generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected server error occurred during learning path generation.',
        code: 'AI_GENERATION_FAILED',
      },
      { status: 500 }
    );
  }
}
