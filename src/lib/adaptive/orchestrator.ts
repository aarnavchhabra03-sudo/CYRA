import { adminClient } from '@/lib/supabase/admin';
import {
  getUserConceptRelationships,
  calculateConceptReadiness,
  detectRootKnowledgeGaps,
  normalizeGraphConcept,
  buildLearnerKnowledgeGraph,
  calculateEffectiveMastery,
  getLearningPathConcepts,
  getLearningPathLessons,
} from './knowledge-graph';
import { generateAdaptiveLearningPlan } from './learning-plan';
import { generateAdaptiveRecommendations, ConceptMasteryRecordInput } from './recommendations';
import { getRelevantTutorMemories, TutorMemoryItem } from '@/lib/tutor/memory';
import { checkAndCleanupActiveAssessment } from './assessment-lifecycle';

export type NextBestActionType =
  | 'continue_lesson'
  | 'review_lesson'
  | 'practice_concept'
  | 'repair_prerequisite'
  | 'take_quiz'
  | 'ask_tutor'
  | 'revisit_notes'
  | 'challenge_practice';

export interface SecondaryAction {
  action: NextBestActionType;
  concept: string | null;
  lessonId?: string | null;
  reason: string;
}

export interface NextBestAction {
  action: NextBestActionType;
  concept: string | null;
  lessonId: string | null;
  priorityScore: number;
  reasonCode: string;
  reason: string;
  secondaryActions: SecondaryAction[];
}

export interface LearnerStateSnapshot {
  userId: string;
  learningPathId?: string | null;
  currentLessonId?: string | null;
  currentLessonTitle?: string | null;
  mastery: Array<{
    concept: string;
    masteryScore: number;
    effectiveMasteryScore: number;
    daysSinceReview: number;
    reviewNeeded: boolean;
    retentionFactor: number;
    lastReviewedAt?: string | null;
    questionsAttempted: number;
    questionsCorrect: number;
    lastResult: string;
    lessonId?: string | null;
  }>;
  recommendations: any[];
  adaptivePlan: any[];
  rootGaps: Array<{ concept: string; rootGapScore: number; blockingCount: number }>;
  blockedConcepts: Array<{
    concept: string;
    readinessScore: number;
    blockingPrerequisites: Array<{ concept: string; masteryScore: number }>;
  }>;
  recentQuizAttempts: Array<{ quizId: string; lessonId?: string; percentage: number; completedAt: string }>;
  recentPracticeAttempts: Array<{
    concept: string;
    percentage: number;
    masteryBefore: number;
    masteryAfter: number;
    completedAt: string;
  }>;
  tutorMemories: TutorMemoryItem[];
  curriculumProgress: number;
  graphAvailable: boolean;
  hasActiveAssessment: boolean;
  learningPathConcepts?: string[];
}

/**
 * Builds a bounded learner state snapshot from database records.
 */
export async function buildLearnerStateSnapshot({
  userId,
  learningPathId,
  currentLessonId,
}: {
  userId: string;
  learningPathId?: string | null;
  currentLessonId?: string | null;
}): Promise<LearnerStateSnapshot> {
  const snapshot: LearnerStateSnapshot = {
    userId,
    learningPathId: learningPathId || null,
    currentLessonId: currentLessonId || null,
    mastery: [],
    recommendations: [],
    adaptivePlan: [],
    rootGaps: [],
    blockedConcepts: [],
    recentQuizAttempts: [],
    recentPracticeAttempts: [],
    tutorMemories: [],
    curriculumProgress: 0,
    graphAvailable: false,
    hasActiveAssessment: false,
  };

  try {
    // 1. Fetch current path concepts and lessons list
    let lpConcepts: Set<string> | null = null;
    let lpLessons: string[] | null = null;
    let firstIncompleteLesson: { id: string; title: string } | null = null;

    if (learningPathId) {
      lpConcepts = await getLearningPathConcepts(learningPathId);
      snapshot.learningPathConcepts = Array.from(lpConcepts);

      // Fetch all lessons of path, ordered by module_order and lesson_order
      const { data: dbLessons } = await adminClient
        .from('lessons')
        .select('id, title, modules!inner(learning_path_id, module_order), lesson_order')
        .eq('modules.learning_path_id', learningPathId);

      const sortedLessons = (dbLessons || []).sort((a, b) => {
        const aModOrder = (a.modules as any)?.module_order || 0;
        const bModOrder = (b.modules as any)?.module_order || 0;
        if (aModOrder !== bModOrder) return aModOrder - bModOrder;
        return (a.lesson_order || 0) - (b.lesson_order || 0);
      });

      lpLessons = sortedLessons.map(l => l.id);

      // Fetch completed lessons from user_progress
      const { data: progressRows } = await adminClient
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', userId);

      const completedLessonIds = new Set(progressRows?.map(r => r.lesson_id) || []);

      const incompleteLessons = sortedLessons.filter(l => !completedLessonIds.has(l.id));
      firstIncompleteLesson = incompleteLessons[0] || null;

      // If the provided currentLessonId is null or if it is already completed,
      // resolve snapshot.currentLessonId and snapshot.currentLessonTitle to the first incomplete lesson
      if (!snapshot.currentLessonId || completedLessonIds.has(snapshot.currentLessonId)) {
        if (firstIncompleteLesson) {
          snapshot.currentLessonId = firstIncompleteLesson.id;
          snapshot.currentLessonTitle = firstIncompleteLesson.title;
        } else {
          snapshot.currentLessonId = null;
          snapshot.currentLessonTitle = null;
        }
      } else {
        // Resolve title for the provided active lesson
        const activeLesson = sortedLessons.find(l => l.id === snapshot.currentLessonId);
        if (activeLesson) {
          snapshot.currentLessonTitle = activeLesson.title;
        }
      }
    }

    // 2. Load Concept Mastery + Relationships in parallel (N+1 prevention)
    let masteryQuery = adminClient
      .from('user_concept_mastery')
      .select('concept, mastery_score, questions_attempted, questions_correct, total_points_possible, total_points_earned, attempt_count, last_result, last_practiced_at, last_reviewed_at, updated_at, learning_path_id, lesson_id')
      .eq('user_id', userId);

    if (learningPathId) {
      masteryQuery = masteryQuery.eq('learning_path_id', learningPathId);
    } else {
      masteryQuery = masteryQuery.is('learning_path_id', null);
    }

    // 3. Parallelise independent selects
    const [masteryResult, relationshipsResult] = await Promise.all([
      masteryQuery,
      getUserConceptRelationships(userId, learningPathId),
    ]);

    const masteryRows = masteryResult.data;
    const relationships = relationshipsResult;

    if (masteryRows && masteryRows.length > 0) {
      snapshot.mastery = masteryRows.map((r) => {
        const decay = calculateEffectiveMastery(
          r.mastery_score,
          r.last_reviewed_at ?? r.last_practiced_at ?? r.updated_at,
          r.questions_attempted || 0
        );
        return {
          concept: r.concept,
          masteryScore: r.mastery_score,
          effectiveMasteryScore: decay.effectiveMasteryScore,
          daysSinceReview: decay.daysSinceReview,
          reviewNeeded: decay.reviewNeeded,
          retentionFactor: decay.retentionFactor,
          lastReviewedAt: r.last_reviewed_at ?? r.last_practiced_at ?? null,
          questionsAttempted: r.questions_attempted || 0,
          questionsCorrect: r.questions_correct || 0,
          lastResult: r.last_result || 'weak',
          lessonId: r.lesson_id || null,
        };
      });
    }

    // Knowledge Graph (pass pre-fetched mastery to avoid duplicate DB read)
    snapshot.graphAvailable = Array.isArray(relationships) && relationships.length > 0;

    if (snapshot.graphAvailable) {
      const preFetchedForGraph = (masteryRows || []).map((r) => ({
        concept: r.concept,
        mastery_score: r.mastery_score,
        questions_attempted: r.questions_attempted || 0,
        last_reviewed_at: r.last_reviewed_at ?? r.last_practiced_at ?? null,
      }));
      const graphData = await buildLearnerKnowledgeGraph(userId, learningPathId, preFetchedForGraph);
      snapshot.rootGaps = graphData.rootGaps.map((rg) => ({
        concept: rg.concept,
        rootGapScore: rg.rootGapScore,
        blockingCount: rg.blockingCount,
      }));
      snapshot.blockedConcepts = graphData.blockedConcepts.map((bc) => ({
        concept: bc.concept,
        readinessScore: bc.readinessScore,
        blockingPrerequisites: bc.blockingPrerequisites.map((bp) => ({
          concept: bp.concept,
          masteryScore: bp.masteryScore,
        })),
      }));
    }

    // 4. Load Recommendations & Learning Plan
    const recordsInput: ConceptMasteryRecordInput[] = snapshot.mastery.map((m) => ({
      concept: m.concept,
      mastery_score: m.masteryScore,
      questions_attempted: m.questionsAttempted,
      questions_correct: m.questionsCorrect,
      attempt_count: 1,
      last_practiced_at: new Date().toISOString(),
      lesson_id: m.lessonId,
    }));

    const recsResult = generateAdaptiveRecommendations(recordsInput, 5, relationships);
    snapshot.recommendations = recsResult.recommendations;

    const planResult = await generateAdaptiveLearningPlan({ userId, learningPathId });
    snapshot.adaptivePlan = planResult.nextTargets;

    // 5. Load Recent Quiz Attempts (course-isolated)
    let quizAttsQuery = adminClient
      .from('quiz_attempts')
      .select('quiz_id, lesson_id, percentage, completed_at')
      .eq('user_id', userId);

    if (learningPathId && lpLessons) {
      if (lpLessons.length > 0) {
        quizAttsQuery = quizAttsQuery.in('lesson_id', lpLessons);
      } else {
        quizAttsQuery = quizAttsQuery.eq('lesson_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { data: quizAtts } = await quizAttsQuery
      .order('completed_at', { ascending: false })
      .limit(5);

    if (quizAtts) {
      snapshot.recentQuizAttempts = quizAtts.map((qa) => ({
        quizId: qa.quiz_id,
        lessonId: qa.lesson_id,
        percentage: qa.percentage,
        completedAt: qa.completed_at,
      }));
    }

    // 6. Load Recent Practice Attempts (course-isolated)
    let practiceAttsQuery = adminClient
      .from('adaptive_practice_attempts')
      .select(`
        percentage,
        mastery_before,
        mastery_after,
        completed_at,
        adaptive_practice_sessions!inner (
          concept,
          lesson_id
        )
      `)
      .eq('user_id', userId);

    if (learningPathId && lpLessons) {
      if (lpLessons.length > 0) {
        practiceAttsQuery = practiceAttsQuery.in('adaptive_practice_sessions.lesson_id', lpLessons);
      } else {
        practiceAttsQuery = practiceAttsQuery.eq('adaptive_practice_sessions.lesson_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { data: practiceAtts } = await practiceAttsQuery
      .order('completed_at', { ascending: false })
      .limit(5);

    if (practiceAtts) {
      snapshot.recentPracticeAttempts = practiceAtts.map((pa: any) => ({
        concept: pa.adaptive_practice_sessions?.concept || 'Practice',
        percentage: pa.percentage,
        masteryBefore: pa.mastery_before,
        masteryAfter: pa.mastery_after,
        completedAt: pa.completed_at,
      }));
    }

    // 7. Check Active Assessment Status
    snapshot.hasActiveAssessment = await checkAndCleanupActiveAssessment(userId);

    // 8. Load Tutor Memories
    snapshot.tutorMemories = await getRelevantTutorMemories({
      userId,
      targetConcept: snapshot.mastery[0]?.concept || 'General Concept',
      conceptList: snapshot.mastery.map((m) => m.concept),
      learningPathId: learningPathId || null,
    });
  } catch (err) {
    console.error('[ORCHESTRATOR] Error building learner state snapshot:', err);
  }

  return snapshot;
}

/**
 * Deterministic Learning State Orchestrator & Next-Best-Action Engine.
 * Evaluates learner state snapshot signals and outputs the authoritative Next Best Action.
 */
export function determineNextBestAction(snapshot: LearnerStateSnapshot): NextBestAction {
  const nextAction = determineNextBestActionRaw(snapshot);

  if (snapshot.learningPathId && nextAction.concept && snapshot.learningPathConcepts) {
    const conceptBelongsToPath = snapshot.learningPathConcepts
      .map(c => normalizeGraphConcept(c))
      .includes(normalizeGraphConcept(nextAction.concept));

    console.log(`[ADAPTIVE_SCOPE] learningPathId=${snapshot.learningPathId}`);
    console.log(`[ADAPTIVE_SCOPE] candidateConcept=${nextAction.concept}`);
    console.log(`[ADAPTIVE_SCOPE] conceptBelongsToPath=${conceptBelongsToPath}`);

    if (!conceptBelongsToPath) {
      console.warn(`[ADAPTIVE_SCOPE] REJECTED course-specific recommendation due to leakage: "${nextAction.concept}" for path: ${snapshot.learningPathId}`);
      // Fallback to current lesson or a safe curriculum step
      return {
        action: 'continue_lesson',
        concept: snapshot.currentLessonTitle || null,
        lessonId: snapshot.currentLessonId || null,
        priorityScore: 60,
        reasonCode: 'NEXT_CURRICULUM_STEP',
        reason: `Proceed with your next curriculum lesson.`,
        secondaryActions: [
          { action: 'revisit_notes', concept: snapshot.currentLessonTitle || null, reason: `Review current lesson study notes.` },
          { action: 'ask_tutor', concept: snapshot.currentLessonTitle || null, reason: `Ask CYRA Tutor any questions about this lesson.` },
        ],
      };
    }
  }

  return nextAction;
}

export function determineNextBestActionRaw(snapshot: LearnerStateSnapshot): NextBestAction {
  // Precedence Level 0: ACTIVE ASSESSMENT SECURITY SHIELD
  if (snapshot.hasActiveAssessment) {
    return {
      action: 'ask_tutor',
      concept: snapshot.mastery[0]?.concept || null,
      lessonId: snapshot.currentLessonId || null,
      priorityScore: 99,
      reasonCode: 'ACTIVE_ASSESSMENT_SHIELD',
      reason: 'You have an active assessment in progress. Ask CYRA Tutor for Socratic hints or conceptual guidance.',
      secondaryActions: [
        { action: 'revisit_notes', concept: snapshot.mastery[0]?.concept || null, reason: 'Review lesson notes for underlying concepts.' },
      ],
    };
  }

  // Course completion check: If no incomplete lessons are remaining in the path
  if (snapshot.learningPathId && !snapshot.currentLessonId) {
    return {
      action: 'ask_tutor',
      concept: null,
      lessonId: null,
      priorityScore: 50,
      reasonCode: 'COURSE_COMPLETED',
      reason: 'Congratulations! You have completed all lessons in this course. Ask CYRA Tutor for advanced challenges or review study notes.',
      secondaryActions: [
        { action: 'revisit_notes', concept: null, reason: 'Review course study notes.' },
        { action: 'ask_tutor', concept: null, reason: 'Ask CYRA Tutor for advanced topics.' },
      ],
    };
  }

  // Precedence Level 1: CRITICAL PREREQUISITE BLOCK
  if (snapshot.blockedConcepts.length > 0) {
    const topBlocked = snapshot.blockedConcepts[0];
    if (topBlocked.blockingPrerequisites.length > 0) {
      const topPrereq = topBlocked.blockingPrerequisites[0];
      const prereqLessonId = snapshot.mastery.find(
        (m) => normalizeGraphConcept(m.concept) === normalizeGraphConcept(topPrereq.concept)
      )?.lessonId || snapshot.currentLessonId || null;

      return {
        action: 'repair_prerequisite',
        concept: topPrereq.concept,
        lessonId: prereqLessonId,
        priorityScore: 94,
        reasonCode: 'BLOCKING_PREREQUISITE',
        reason: `Strengthening ${topPrereq.concept} (${topPrereq.masteryScore}% mastery) first will unlock ${topBlocked.concept}.`,
        secondaryActions: [
          { action: 'ask_tutor', concept: topPrereq.concept, reason: `Ask CYRA Tutor for a beginner explanation of ${topPrereq.concept}.` },
          { action: 'revisit_notes', concept: topPrereq.concept, reason: `Review study notes for ${topPrereq.concept}.` },
        ],
      };
    }
  }

  // Precedence Level 2: ANTI-LOOP / REPEATED FAILURE DETECTION
  // Check if any concept has >= 2 recent practice attempts with score < 60% or improvement < 10 points
  const recentPracticeByConcept = new Map<string, number[]>();
  for (const pa of snapshot.recentPracticeAttempts) {
    const norm = normalizeGraphConcept(pa.concept);
    const scores = recentPracticeByConcept.get(norm) || [];
    scores.push(pa.percentage);
    recentPracticeByConcept.set(norm, scores);
  }

  for (const [normC, scores] of recentPracticeByConcept.entries()) {
    if (scores.length >= 2 && scores[0] < 60 && scores[1] < 60) {
      const origConcept = snapshot.mastery.find((m) => normalizeGraphConcept(m.concept) === normC)?.concept || normC;
      const lessonId = snapshot.mastery.find((m) => normalizeGraphConcept(m.concept) === normC)?.lessonId || null;

      return {
        action: 'ask_tutor',
        concept: origConcept,
        lessonId,
        priorityScore: 90,
        reasonCode: 'REPEATED_FAILURE',
        reason: `CYRA recommends a guided explanation before another practice attempt because ${origConcept} has remained challenging across several attempts.`,
        secondaryActions: [
          { action: 'review_lesson', concept: origConcept, reason: `Review core study notes for ${origConcept}.` },
          { action: 'revisit_notes', concept: origConcept, reason: `Revisit key concepts in study guide.` },
        ],
      };
    }
  }

  // Precedence Level 3: DEMONSTRATED WEAKNESS (< 40% mastery with assessed evidence)
  const demonstratedWeakness = snapshot.mastery
    .filter((m) => m.masteryScore < 40 && m.questionsAttempted > 0)
    .sort((a, b) => a.masteryScore - b.masteryScore)[0];

  if (demonstratedWeakness) {
    // Check for intervention stagnation on this concept
    const recentStagnant = snapshot.recentPracticeAttempts.filter(
      (pa) => normalizeGraphConcept(pa.concept) === normalizeGraphConcept(demonstratedWeakness.concept)
    );

    if (recentStagnant.length >= 2 && recentStagnant.every((pa) => pa.percentage < 50)) {
      return {
        action: 'ask_tutor',
        concept: demonstratedWeakness.concept,
        lessonId: demonstratedWeakness.lessonId || snapshot.currentLessonId || null,
        priorityScore: 88,
        reasonCode: 'INTERVENTION_STAGNATION',
        reason: `CYRA recommends switching to a guided explanation because recent practice sessions on ${demonstratedWeakness.concept} have shown minimal mastery gain.`,
        secondaryActions: [
          { action: 'review_lesson', concept: demonstratedWeakness.concept, reason: `Review core study notes for ${demonstratedWeakness.concept}.` },
          { action: 'revisit_notes', concept: demonstratedWeakness.concept, reason: `Revisit study guide.` },
        ],
      };
    }

    return {
      action: 'practice_concept',
      concept: demonstratedWeakness.concept,
      lessonId: demonstratedWeakness.lessonId || snapshot.currentLessonId || null,
      priorityScore: 82,
      reasonCode: 'DEMONSTRATED_WEAKNESS',
      reason: `A targeted practice session will build solid mastery in ${demonstratedWeakness.concept} (${demonstratedWeakness.masteryScore}%).`,
      secondaryActions: [
        { action: 'review_lesson', concept: demonstratedWeakness.concept, reason: `Review core study notes for ${demonstratedWeakness.concept}.` },
        { action: 'ask_tutor', concept: demonstratedWeakness.concept, reason: `Ask CYRA Tutor for a breakdown of ${demonstratedWeakness.concept}.` },
      ],
    };
  }

  // Precedence Level 4: ACTIVE MISCONCEPTION
  const activeMisconception = snapshot.tutorMemories.find(
    (m) => m.memoryType === 'misconception' && !m.resolvedAt && (m.reliabilityScore || 0) >= 65
  );

  if (activeMisconception) {
    const concept = activeMisconception.concept;
    const lessonId = snapshot.mastery.find((m) => normalizeGraphConcept(m.concept) === normalizeGraphConcept(concept))?.lessonId || null;

    return {
      action: 'ask_tutor',
      concept,
      lessonId,
      priorityScore: 78,
      reasonCode: 'ACTIVE_MISCONCEPTION',
      reason: `Review ${concept} with CYRA Tutor to address a recorded misconception.`,
      secondaryActions: [
        { action: 'review_lesson', concept, reason: `Review study notes for ${concept}.` },
        { action: 'practice_concept', concept, reason: `Perform a short practice quiz on ${concept}.` },
      ],
    };
  }

  // Precedence Level 5: MASTERY DECAY — requires assessed evidence (questions_attempted > 0)
  const decayedCritical = snapshot.mastery
    .filter((m) => m.questionsAttempted > 0 && m.effectiveMasteryScore < 50)
    .sort((a, b) => a.effectiveMasteryScore - b.effectiveMasteryScore)[0];

  if (decayedCritical) {
    const lessonId = decayedCritical.lessonId || snapshot.currentLessonId || null;
    return {
      action: 'review_lesson',
      concept: decayedCritical.concept,
      lessonId,
      priorityScore: 75,
      reasonCode: 'MASTERY_DECAY_PRIORITY',
      reason: `${decayedCritical.concept} mastery has significantly faded (effective score: ${decayedCritical.effectiveMasteryScore}%). A review is strongly recommended before advancing.`,
      secondaryActions: [
        { action: 'practice_concept', concept: decayedCritical.concept, reason: `Reinforce ${decayedCritical.concept} with a short practice quiz.` },
        { action: 'ask_tutor', concept: decayedCritical.concept, reason: `Ask CYRA Tutor to re-explain key ideas in ${decayedCritical.concept}.` },
      ],
    };
  }

  const decayedModerate = snapshot.mastery
    .filter((m) => m.questionsAttempted > 0 && m.effectiveMasteryScore >= 50 && m.effectiveMasteryScore < 85)
    .sort((a, b) => a.effectiveMasteryScore - b.effectiveMasteryScore)[0];

  if (decayedModerate && decayedModerate.daysSinceReview > 21) {
    const lessonId = decayedModerate.lessonId || snapshot.currentLessonId || null;
    return {
      action: 'practice_concept',
      concept: decayedModerate.concept,
      lessonId,
      priorityScore: 68,
      reasonCode: 'MASTERY_DECAY_REVIEW',
      reason: `Your recall of ${decayedModerate.concept} may have faded. A brief practice will keep your knowledge sharp (effective score: ${decayedModerate.effectiveMasteryScore}%).`,
      secondaryActions: [
        { action: 'review_lesson', concept: decayedModerate.concept, reason: `Revisit study notes for ${decayedModerate.concept}.` },
        { action: 'ask_tutor', concept: decayedModerate.concept, reason: `Ask CYRA Tutor for a refresher on ${decayedModerate.concept}.` },
      ],
    };
  }

  // Precedence Level 6: READY FOR ASSESSMENT
  if (snapshot.currentLessonId) {
    const hasRecentPassingQuiz = snapshot.recentQuizAttempts.some(
      (qa) => qa.lessonId === snapshot.currentLessonId && qa.percentage >= 60
    );

    if (!hasRecentPassingQuiz) {
      return {
        action: 'take_quiz',
        concept: snapshot.currentLessonTitle || null,
        lessonId: snapshot.currentLessonId,
        priorityScore: 72,
        reasonCode: 'READY_FOR_ASSESSMENT',
        reason: `You are ready to test your knowledge. Take the lesson quiz to verify complete understanding.`,
        secondaryActions: [
          { action: 'revisit_notes', concept: snapshot.currentLessonTitle || null, reason: `Quickly review lesson study notes before taking quiz.` },
          { action: 'ask_tutor', concept: snapshot.currentLessonTitle || null, reason: `Ask CYRA Tutor for a pre-quiz review.` },
        ],
      };
    }
  }

  // Precedence Level 6: PROFICIENT / CHALLENGE PRACTICE
  const proficientConcept = snapshot.mastery
    .filter((m) => m.masteryScore >= 85 && m.questionsAttempted > 0)
    .sort((a, b) => b.masteryScore - a.masteryScore)[0];

  if (proficientConcept && snapshot.mastery.every((m) => m.masteryScore >= 70)) {
    return {
      action: 'challenge_practice',
      concept: proficientConcept.concept,
      lessonId: proficientConcept.lessonId || null,
      priorityScore: 45,
      reasonCode: 'MASTERY_STABLE',
      reason: `You have strong mastery across all concepts. Attempt an advanced challenge practice to solidify ${proficientConcept.concept}.`,
      secondaryActions: [
        { action: 'continue_lesson', concept: null, reason: `Proceed to next curriculum module.` },
      ],
    };
  }

  // Precedence Level 7: CURRICULUM CONTINUATION (DEFAULT)
  return {
    action: 'continue_lesson',
    concept: snapshot.currentLessonTitle || null,
    lessonId: snapshot.currentLessonId || null,
    priorityScore: 60,
    reasonCode: 'NEXT_CURRICULUM_STEP',
    reason: `Proceed with your next curriculum lesson.`,
    secondaryActions: [
      { action: 'revisit_notes', concept: snapshot.currentLessonTitle || null, reason: `Review current lesson study notes.` },
      { action: 'ask_tutor', concept: snapshot.currentLessonTitle || null, reason: `Ask CYRA Tutor any questions about this lesson.` },
    ],
  };
}
