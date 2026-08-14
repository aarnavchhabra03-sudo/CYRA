import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getAIProvider } from '@/lib/ai/provider';
import { buildTutorContext, resolvePrimaryTargetConcept } from '@/lib/tutor/context';
import { buildTutorSystemPrompt, isAnswerExtractionAttempt } from '@/lib/tutor/prompt';
import { extractTutorMemoryCandidates, persistTutorMemories } from '@/lib/tutor/memory';
import { selectTeachingStrategy } from '@/lib/tutor/strategy';

export async function GET(request: Request) {
  console.log('[TUTOR] GET request received');

  // 1. Authenticate user session
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.warn('[TUTOR] Auth required for GET');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to access tutor session.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const user = authData.user;
    console.log('[TUTOR] authenticated user:', user.id);

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const conversationId = searchParams.get('conversationId');
    let learningPathId = searchParams.get('learningPathId');

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Resolve non-UUID learningPathId aliases (e.g., 'operating-systems', 'os-101') or missing IDs
    if (!learningPathId || !UUID_REGEX.test(learningPathId)) {
      if (lessonId && UUID_REGEX.test(lessonId)) {
        const { data: lessonRecord } = await adminClient
          .from('lessons')
          .select('modules!inner(learning_path_id)')
          .eq('id', lessonId)
          .maybeSingle();
        if (lessonRecord) {
          learningPathId = (lessonRecord as any).modules?.learning_path_id || null;
        }
      }

      if (!learningPathId || !UUID_REGEX.test(learningPathId)) {
        // Fallback: resolve user's active learning path from Supabase
        const { data: userPaths } = await adminClient
          .from('learning_paths')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (userPaths && userPaths.length > 0) {
          learningPathId = userPaths[0].id;
        } else {
          // User has no active courses in the database yet: return standalone course selection indicator
          console.log('[TUTOR GET] No active learning path found for user. Returning standalone selection state.');
          return NextResponse.json({
            success: true,
            data: {
              isStandaloneNoCourse: true,
              conversationId: null,
              messages: [],
              context: null,
            },
          });
        }
      }
    }

    if (lessonId && !UUID_REGEX.test(lessonId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid lesson context ID format.',
          code: 'INVALID_PARAMETER_FORMAT',
        },
        { status: 400 }
      );
    }

    if (conversationId && !UUID_REGEX.test(conversationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid conversation ID format.',
          code: 'INVALID_PARAMETER_FORMAT',
        },
        { status: 400 }
      );
    }

    // Validate ownership: Verify lessonId belongs to learningPathId
    if (lessonId && learningPathId) {
      const { data: lessonRecord } = await adminClient
        .from('lessons')
        .select('modules!inner(learning_path_id)')
        .eq('id', lessonId)
        .maybeSingle();

      const lessonPathId = (lessonRecord as any)?.modules?.learning_path_id;
      if (!lessonPathId || lessonPathId !== learningPathId) {
        console.warn('[TUTOR GET] Mismatched lesson and path identifiers!');
        return NextResponse.json(
          {
            success: false,
            error: 'The specified lesson does not belong to the active course.',
            code: 'INVALID_LESSON_COURSE_MATCH',
          },
          { status: 400 }
        );
      }
    }

    // Validate ownership of learning path
    const { data: pathRecord } = await adminClient
      .from('learning_paths')
      .select('id, user_id')
      .eq('id', learningPathId)
      .maybeSingle();

    if (!pathRecord || pathRecord.user_id !== user.id) {
      console.warn('[TUTOR GET] Unauthorized path context access');
      return NextResponse.json(
        {
          success: false,
          error: 'You are not authorized to view tutor context for this course.',
          code: 'UNAUTHORIZED',
        },
        { status: 403 }
      );
    }

    // Load or find active conversation
    let targetConvId = conversationId;
    let resolvedLessonId = lessonId || null;

    if (targetConvId) {
      const { data: existingConv } = await adminClient
        .from('ai_tutor_conversations')
        .select('id, user_id, lesson_id, learning_path_id')
        .eq('id', targetConvId)
        .maybeSingle();

      if (!existingConv || existingConv.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'You are not authorized to view this conversation.',
            code: 'UNAUTHORIZED',
          },
          { status: 403 }
        );
      }

      if (existingConv.learning_path_id !== learningPathId) {
        console.warn(`[TUTOR GET] Cross-course access attempt blocked: conversation.learning_path_id=${existingConv.learning_path_id}, requested.learningPathId=${learningPathId}`);
        return NextResponse.json(
          {
            success: false,
            error: 'The requested conversation does not belong to the active course.',
            code: 'CROSS_COURSE_ACCESS_DENIED',
          },
          { status: 400 }
        );
      }

      if (existingConv.lesson_id) {
        resolvedLessonId = existingConv.lesson_id;
      }
    } else {
      let convQuery = adminClient
        .from('ai_tutor_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('learning_path_id', learningPathId);

      if (lessonId) {
        convQuery = convQuery.eq('lesson_id', lessonId);
      } else {
        convQuery = convQuery.is('lesson_id', null);
      }

      const { data: existingConv } = await convQuery
        .order('updated_at', { ascending: false })
        .maybeSingle();

      if (existingConv) {
        targetConvId = existingConv.id;
      }
    }

    let messages: any[] = [];
    if (targetConvId) {
      const { data: dbMessages } = await adminClient
        .from('ai_tutor_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', targetConvId)
        .order('created_at', { ascending: true });

      messages = dbMessages || [];
    }

    // Build tutor context & select teaching strategy
    const context = await buildTutorContext({ userId: user.id, learningPathId, lessonId: resolvedLessonId });
    const target = resolvePrimaryTargetConcept(context);
    const plan = selectTeachingStrategy(context, '', undefined);

    console.log('[TUTOR] context built, target concept:', target.concept, 'strategy:', plan.strategy, 'reasons:', plan.rationaleCodes);

    return NextResponse.json({
      success: true,
      data: {
        conversationId: targetConvId || null,
        messages,
        context: {
          lessonTitle: context.lessonTitle || context.learningPathTitle || 'General Tutor',
          learningPathTitle: context.learningPathTitle,
          primaryWeakConcept: target.concept,
          primaryWeakConceptScore: target.masteryScore,
          primaryTargetConcept: target.concept,
          primaryTargetLevel: target.level,
          weakConcepts: context.weakConcepts,
          developingConcepts: context.developingConcepts,
          proficientConcepts: context.proficientConcepts,
          masteredConcepts: context.masteredConcepts,
          hasActiveAssessment: context.hasActiveAssessment,
          memoryCount: context.tutorMemories.length,
          memoryEnabled: true,
          tutorMemories: context.tutorMemories,
          memoryIntelligence: (context.tutorMemories || []).map((m) => ({
            concept: m.concept,
            type: m.memoryType,
            relevance: m.relevance || 'general',
            reliabilityScore: m.reliabilityScore || 0,
          })),
          teachingStrategy: plan.strategy,
          targetConcept: plan.targetConcept,
          explanationDepth: plan.explanationDepth,
          strategyReasons: plan.rationaleCodes,
        },
      },
    });
  } catch (error: any) {
    console.error('[TUTOR] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load tutor session.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('[TUTOR] POST request received');

  // 1. Authenticate user session
  let user;
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.warn('[TUTOR] Auth required for POST');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to speak with AI Tutor.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
    user = authData.user;
    console.log('[TUTOR] authenticated:', user.id);
  } catch (err) {
    console.error('[TUTOR] Auth exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
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
        error: 'Invalid JSON payload.',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  const { learningPathId: bodyPathId, lessonId, conversationId, message, mode } = body || {};
  let learningPathId = bodyPathId || null;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Resolve non-UUID learningPathId aliases (e.g., 'operating-systems') or missing IDs
  if (!learningPathId || !UUID_REGEX.test(learningPathId)) {
    if (lessonId && UUID_REGEX.test(lessonId)) {
      const { data: lessonRecord } = await adminClient
        .from('lessons')
        .select('modules!inner(learning_path_id)')
        .eq('id', lessonId)
        .maybeSingle();
      if (lessonRecord) {
        learningPathId = (lessonRecord as any).modules?.learning_path_id || null;
      }
    }

    if (!learningPathId || !UUID_REGEX.test(learningPathId)) {
      // Fallback: resolve user's active learning path from Supabase
      const { data: userPaths } = await adminClient
        .from('learning_paths')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (userPaths && userPaths.length > 0) {
        learningPathId = userPaths[0].id;
      }
    }
  }

  if (lessonId && !UUID_REGEX.test(lessonId)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid lesson context ID format.',
        code: 'INVALID_PARAMETER_FORMAT',
      },
      { status: 400 }
    );
  }

  if (conversationId && !UUID_REGEX.test(conversationId)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid conversation ID format.',
        code: 'INVALID_PARAMETER_FORMAT',
      },
      { status: 400 }
    );
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'message (string) is required.',
        code: 'INVALID_INPUT',
      },
      { status: 400 }
    );
  }

  try {
    // Resolve learningPathId from lessonId if missing
    if (lessonId && !learningPathId) {
      const { data: lessonRecord } = await adminClient
        .from('lessons')
        .select('modules!inner(learning_path_id)')
        .eq('id', lessonId)
        .maybeSingle();
      if (lessonRecord) {
        learningPathId = (lessonRecord as any).modules?.learning_path_id || null;
      }
    }

    // Fail closed if learningPathId is missing
    if (!learningPathId) {
      console.warn('[TUTOR POST] Missing learningPathId. Failing closed.');
      return NextResponse.json(
        {
          success: false,
          error: 'Course context (learningPathId) is required.',
          code: 'LEARNING_PATH_REQUIRED',
        },
        { status: 400 }
      );
    }

    // Validate ownership: Verify lessonId belongs to learningPathId
    if (lessonId && learningPathId) {
      const { data: lessonRecord } = await adminClient
        .from('lessons')
        .select('modules!inner(learning_path_id)')
        .eq('id', lessonId)
        .maybeSingle();

      const lessonPathId = (lessonRecord as any)?.modules?.learning_path_id;
      if (!lessonPathId || lessonPathId !== learningPathId) {
        console.warn('[TUTOR POST] Mismatched lesson and path identifiers!');
        return NextResponse.json(
          {
            success: false,
            error: 'The specified lesson does not belong to the active course.',
            code: 'INVALID_LESSON_COURSE_MATCH',
          },
          { status: 400 }
        );
      }
    }

    // Validate ownership of learning path
    const { data: pathRecord } = await adminClient
      .from('learning_paths')
      .select('id, user_id')
      .eq('id', learningPathId)
      .maybeSingle();

    if (!pathRecord || pathRecord.user_id !== user.id) {
      console.warn('[TUTOR POST] Unauthorized path context access');
      return NextResponse.json(
        {
          success: false,
          error: 'You are not authorized to speak to the tutor in this course.',
          code: 'UNAUTHORIZED',
        },
        { status: 403 }
      );
    }
    console.log('[TUTOR] ownership verified');

    // 4. LOAD OR CREATE CONVERSATION RECORD & RESOLVE PROVENANCE LESSON ID
    let convId = conversationId;
    let validatedLessonId = lessonId || null;

    if (convId) {
      const { data: existingConv } = await adminClient
        .from('ai_tutor_conversations')
        .select('id, user_id, lesson_id, learning_path_id')
        .eq('id', convId)
        .maybeSingle();

      if (!existingConv || existingConv.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Target conversation not found or access denied.',
            code: 'UNAUTHORIZED',
          },
          { status: 403 }
        );
      }

      if (existingConv.learning_path_id !== learningPathId) {
        console.warn(`[TUTOR POST] Cross-course access attempt blocked: conversation.learning_path_id=${existingConv.learning_path_id}, requested.learningPathId=${learningPathId}`);
        return NextResponse.json(
          {
            success: false,
            error: 'The requested conversation does not belong to the active course.',
            code: 'CROSS_COURSE_ACCESS_DENIED',
          },
          { status: 400 }
        );
      }

      if (existingConv.lesson_id && !validatedLessonId) {
        validatedLessonId = existingConv.lesson_id;
      }
    } else {
      // Idempotent lookup: Check if there's already an active conversation for this user, course path, and lesson
      let convQuery = adminClient
        .from('ai_tutor_conversations')
        .select('id, lesson_id')
        .eq('user_id', user.id)
        .eq('learning_path_id', learningPathId);

      if (validatedLessonId) {
        convQuery = convQuery.eq('lesson_id', validatedLessonId);
      } else {
        convQuery = convQuery.is('lesson_id', null);
      }

      const { data: existingConv } = await convQuery
        .order('updated_at', { ascending: false })
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
        console.log(`[TUTOR POST] Reusing existing conversation: convId=${convId}`);
      } else {
        // Create new conversation row
        const { data: newConv, error: convErr } = await adminClient
          .from('ai_tutor_conversations')
          .insert({
            user_id: user.id,
            learning_path_id: learningPathId,
            lesson_id: validatedLessonId,
            title: `Tutor Chat (${new Date().toLocaleDateString()})`,
          })
          .select()
          .single();

        if (convErr || !newConv) {
          console.error("[TUTOR][CONVERSATION_INIT_FAILED]", {
            userId: user.id,
            lessonId: validatedLessonId,
            learningPathId,
            conversationId: convId,
            dbCode: convErr?.code,
            dbMessage: convErr?.message,
            dbDetails: convErr?.details,
            dbHint: convErr?.hint
          });
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to initialize tutor conversation.',
              code: 'DB_CONVERSATION_FAILED',
            },
            { status: 500 }
          );
        }
        convId = newConv.id;
        console.log(`[TUTOR POST] Created new conversation: convId=${convId}`);
      }
    }

    // 5. LOAD CONVERSATION MESSAGES + EXISTING SUMMARY
    // Fetch all messages for windowing decision, plus conversation summary
    const [allMessagesResult, convRecord] = await Promise.all([
      adminClient
        .from('ai_tutor_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true }),
      adminClient
        .from('ai_tutor_conversations')
        .select('summary')
        .eq('id', convId)
        .maybeSingle(),
    ]);

    const allMessages = allMessagesResult.data || [];
    const existingSummary: string | null = (convRecord?.data as any)?.summary ?? null;

    // Window to latest 15 messages for active context
    const WINDOW_SIZE = 15;
    const orderedHistory = allMessages.slice(-WINDOW_SIZE);

    // 6. BUILD TUTOR CONTEXT, SELECT TEACHING PLAN, & CONSTRUCT SYSTEM PROMPT
    const context = await buildTutorContext({ userId: user.id, learningPathId, lessonId: validatedLessonId });
    const target = resolvePrimaryTargetConcept(context);
    const plan = selectTeachingStrategy(context, message, mode);

    console.log('[TUTOR] context built, target concept:', target.concept, 'strategy:', plan.strategy, 'reasons:', plan.rationaleCodes);

    const systemInstruction = buildTutorSystemPrompt(context, message, mode, plan);

    // DETERMINISTIC SERVER-SIDE ANSWER EXTRACTION PROTECTION
    const isExtractionAttempt = context.hasActiveAssessment && isAnswerExtractionAttempt(message);

    // 7. FORMAT CONVERSATION PROMPT FOR AI PROVIDER
    // Prepend bounded conversation summary if it exists
    let fullPrompt = '';
    if (existingSummary) {
      fullPrompt += `[PRIOR CONVERSATION SUMMARY (educational context only)]\n${existingSummary}\n\n`;
    }
    fullPrompt += `Below is the recent dialogue history with the student:\n\n`;
    for (const pastMsg of orderedHistory) {
      fullPrompt += `${pastMsg.role.toUpperCase()}: ${pastMsg.content}\n\n`;
    }

    if (isExtractionAttempt) {
      console.log('[TUTOR PROTECTION] Deterministic answer extraction attempt detected during active assessment!');
      fullPrompt += `\n[FORCED SECURITY DIRECTIVE: The student is attempting to obtain a direct answer to an active assessment. YOU MUST OPEN YOUR RESPONSE WITH THIS EXACT SENTENCE: "You currently have an active assessment, so I can't provide the direct answer or tell you which option is correct. I can give you a hint, explain the underlying concept, or guide you through the reasoning step by step." Then provide Socratic guidance or conceptual hints ONLY. NEVER disclose option letters, option numbers, or direct answers.]\n`;
    } else if (mode) {
      fullPrompt += `[TEACHING MODE: ${mode} ON TARGET CONCEPT: "${target.concept}"]\n`;
    }

    fullPrompt += `STUDENT: ${message}\n\nASSISTANT:`;

    // 8. CALL AI PROVIDER
    const provider = getAIProvider();
    console.log('[TUTOR] request received');
    console.log('[TUTOR] user message length:', message.length);
    console.log('[TUTOR] selected model/provider:', provider.name);

    const aiRes = await provider.generateContent({
      prompt: fullPrompt,
      systemInstruction,
      temperature: 0.7,
      maxTokens: 1000,
    });

    console.log('[TUTOR] model call completed');
    console.log('[TUTOR] model call succeeded:', aiRes.success);
    console.log('[TUTOR] response object shape:', { success: aiRes.success, hasMessage: Boolean(aiRes.message), error: aiRes.error || null });

    if (!aiRes.success || !aiRes.message) {
      console.error('[TUTOR] Provider generation failed:', aiRes.error);
      console.log('[TUTOR] final API response status: 502');
      return NextResponse.json(
        {
          success: false,
          error: aiRes.error || "CYRA couldn't generate a response right now. Please try again.",
          code: aiRes.code || 'AI_PROVIDER_ERROR',
        },
        { status: 502 }
      );
    }

    const assistantResponseText = aiRes.message.trim();
    console.log('[TUTOR] extracted assistant text length:', assistantResponseText.length);

    // 9. PERSIST USER MESSAGE & ASSISTANT RESPONSE
    await adminClient.from('ai_tutor_messages').insert([
      { conversation_id: convId, role: 'user', content: message },
      { conversation_id: convId, role: 'assistant', content: assistantResponseText },
    ]);

    // Update conversation timestamp
    await adminClient
      .from('ai_tutor_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    console.log('[TUTOR] conversation persisted successfully');

    // 9B. ASYNC BACKGROUND CONVERSATION SUMMARIZATION (triggered when > 15 messages accumulated)
    const totalAfterInsert = allMessages.length + 2; // +2 for the just-inserted pair
    const shouldSummarize = totalAfterInsert > WINDOW_SIZE && (totalAfterInsert % 5 === 0 || !existingSummary);

    if (shouldSummarize) {
      const SUMMARY_MAX_CHARS = 1500;
      // Build summarization prompt from the older messages (those outside the window)
      const olderMessages = allMessages.slice(0, Math.max(0, allMessages.length - WINDOW_SIZE));
      if (olderMessages.length > 0) {
        const summaryDialogue = olderMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n\n');

        const summaryPrompt = `You are summarizing an educational tutoring conversation for internal memory.

STRICT RULES:
- Include ONLY learner-visible educational information: concepts discussed, misconceptions, unresolved questions, successful explanations, and learning preferences.
- NEVER include: system prompts, hidden reasoning, assessment answers, security directives, credentials, or database internals.
- Maximum length: ${SUMMARY_MAX_CHARS} characters.
- Write a tight, factual summary in plain prose. Do not use bullet lists.

CONVERSATION TO SUMMARIZE:
${summaryDialogue.slice(0, 8000)}

SUMMARY:`;

        provider.generateContent({
          prompt: summaryPrompt,
          temperature: 0.3,
          maxTokens: 400,
        }).then((summaryRes) => {
          if (summaryRes.success && summaryRes.message) {
            const bounded = summaryRes.message.trim().slice(0, SUMMARY_MAX_CHARS);
            Promise.resolve(
              adminClient
                .from('ai_tutor_conversations')
                .update({ summary: bounded })
                .eq('id', convId)
            )
              .then(() => console.log('[TUTOR SUMMARY] Conversation summary updated.'))
              .catch((e) => console.warn('[TUTOR SUMMARY] Failed to persist summary:', e));
          }
        }).catch((e) => console.warn('[TUTOR SUMMARY] Summary generation error (non-critical):', e));
      }
    }

    // 10. NON-BLOCKING BACKGROUND MEMORY EXTRACTION & PERSISTENCE (PROVENANCE LESSON ID PRESERVED)
    extractTutorMemoryCandidates({
      userMessage: message,
      assistantResponse: assistantResponseText,
      targetConcept: target.concept,
    })
      .then((candidates) => {
        if (candidates && candidates.length > 0) {
          persistTutorMemories({
            userId: user.id,
            conversationId: convId,
            lessonId: validatedLessonId,
            memories: candidates,
          });
        }
      })
      .catch((mErr) => {
        console.warn('[TUTOR API] Async memory extraction error (non-critical):', mErr);
      });

    // 11. RETURN SAFE RESPONSE PAYLOAD
    console.log('[TUTOR] final API response status: 200');
    const responseContext = {
      lessonTitle: context.lessonTitle || context.learningPathTitle || 'General Tutor',
      primaryWeakConcept: target.concept,
      primaryWeakConceptScore: target.masteryScore,
      primaryTargetConcept: target.concept,
      primaryTargetLevel: target.level,
      hasActiveAssessment: context.hasActiveAssessment,
      memoryCount: context.tutorMemories.length,
      memoryEnabled: true,
      tutorMemories: context.tutorMemories,
      memoryIntelligence: (context.tutorMemories || []).map((m) => ({
        concept: m.concept,
        type: m.memoryType,
        relevance: m.relevance || 'general',
        reliabilityScore: m.reliabilityScore || 0,
      })),
      teachingStrategy: plan.strategy,
      targetConcept: plan.targetConcept,
      explanationDepth: plan.explanationDepth,
      strategyReasons: plan.rationaleCodes,
    };

    return NextResponse.json({
      success: true,
      response: assistantResponseText,
      message: assistantResponseText,
      conversationId: convId,
      learnerContext: responseContext,
      data: {
        conversationId: convId,
        reply: assistantResponseText,
        message: {
          role: 'assistant',
          content: assistantResponseText,
        },
        context: responseContext,
      },
    });
  } catch (error: any) {
    console.error('[TUTOR] Server error during tutor processing:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing tutor response.',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
