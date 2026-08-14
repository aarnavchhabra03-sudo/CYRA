import { buildLearnerStateSnapshot, determineNextBestAction } from '@/lib/adaptive/orchestrator';
import { calculateEffectiveMastery } from '@/lib/adaptive/knowledge-graph';
import {
  ResearchIntelligenceData,
  ResearchKnowledgeGap,
  ResearchRecommendation,
  ResearchActivityItem,
  ResearchLearningConnection,
  ResearchRecommendationType,
} from './types';

export interface BuildIntelligenceOptions {
  supabase: any;
  userId: string;
}

/**
 * Normalizes query string into a broad core topic key for duplicate & depth matching
 */
export function normalizeTopicKey(text: string): string {
  if (!text) return 'general';
  return text
    .toLowerCase()
    .replace(/^(how does|explain|what is|compare|overview of|introduction to|latest research on|a study of|survey of)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ');
}

/**
 * Computes deterministic score (bounded 0-100) and priority level
 */
export function scoreRecommendation(signals: {
  isMasteryGap?: boolean;
  hasMemoryDecay?: boolean;
  isBlockedPrereq?: boolean;
  isNextLesson?: boolean;
  hasRecentResearchRelation?: boolean;
  isResearchedRecently?: boolean;
  isAlreadyMastered?: boolean;
  isDuplicate?: boolean;
}): { score: number; priority: 'HIGH' | 'MEDIUM' | 'LOW'; reasonsList: string[] } {
  let baseScore = 40;
  const reasonsList: string[] = [];

  if (signals.isMasteryGap) {
    baseScore += 30;
    reasonsList.push('Low mastery score');
  }

  if (signals.hasMemoryDecay) {
    baseScore += 25;
    reasonsList.push('Memory decay detected');
  }

  if (signals.isBlockedPrereq) {
    baseScore += 30;
    reasonsList.push('Blocks another concept');
  }

  if (signals.isNextLesson) {
    baseScore += 20;
    reasonsList.push('Related to your current lesson');
  }

  if (signals.hasRecentResearchRelation) {
    baseScore += 15;
    reasonsList.push('Builds on recent research');
  }

  if (signals.isResearchedRecently) {
    baseScore -= 20;
  }

  if (signals.isAlreadyMastered) {
    baseScore -= 25;
  }

  if (signals.isDuplicate) {
    baseScore -= 40;
  }

  // Bounded strictly between 0 and 100
  const finalScore = Math.min(100, Math.max(0, baseScore));
  const priority = finalScore >= 70 ? 'HIGH' : finalScore >= 45 ? 'MEDIUM' : 'LOW';

  return {
    score: finalScore,
    priority,
    reasonsList: reasonsList.length > 0 ? reasonsList : ['Recommended learning topic'],
  };
}

/**
 * Deterministically constructs Research Intelligence from database tables & adaptive engine state
 */
export async function buildResearchIntelligence({
  supabase,
  userId,
}: BuildIntelligenceOptions): Promise<ResearchIntelligenceData> {
  console.log(`[RESEARCH INTELLIGENCE] Building deterministic recommendations for user ${userId}`);

  // 1. Fetch user's saved research documents
  const { data: rawResearchDocs } = await supabase
    .from('research_documents')
    .select('id, title, query, intent, brief, learning_path_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const researchDocs = rawResearchDocs || [];

  const recentActivity: ResearchActivityItem[] = researchDocs.slice(0, 10).map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    query: doc.query,
    intent: doc.intent,
    citationCount: doc.brief?.citations?.length || 0,
    savedAt: doc.created_at,
    learningPathId: doc.learning_path_id,
  }));

  const researchedTopicKeys = new Set(
    researchDocs.map((doc: any) => normalizeTopicKey(doc.query || doc.title))
  );

  // 2. Fetch user's active learning paths
  const { data: rawPaths } = await supabase
    .from('learning_paths')
    .select('id, title, updated_at, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  const activePaths = rawPaths || [];

  if (activePaths.length === 0) {
    // Empty state for brand new users with no active courses
    return {
      hasLearningHistory: false,
      currentLearningPath: null,
      knowledgeGaps: [],
      recommendations: [
        {
          id: 'rec-default-1',
          topic: 'Artificial Intelligence & Machine Learning Fundamentals',
          searchQuery: 'Explain Artificial Intelligence and Machine Learning fundamentals',
          reason: 'Explore foundational AI concepts',
          reasonsList: ['Popular research entry point'],
          priority: 'MEDIUM',
          score: 60,
          recommendationType: 'RELATED_TOPIC',
        },
        {
          id: 'rec-default-2',
          topic: 'TCP Congestion Control & Network Performance',
          searchQuery: 'How does TCP congestion control work?',
          reason: 'Explore computer networking preprints',
          reasonsList: ['Popular computer science topic'],
          priority: 'MEDIUM',
          score: 55,
          recommendationType: 'RELATED_TOPIC',
        },
      ],
      recentActivity,
      learningConnections: [],
    };
  }

  const primaryPath = activePaths[0];

  // 3. Build Learner State Snapshot using existing adaptive engine
  let snapshot: any = null;
  let nextBestAction: any = null;

  try {
    snapshot = await buildLearnerStateSnapshot({
      userId,
      learningPathId: primaryPath.id,
    });
    nextBestAction = determineNextBestAction(snapshot);
  } catch (snapErr) {
    console.warn('[RESEARCH INTELLIGENCE] Learner state snapshot warning:', snapErr);
  }

  // 4. Fetch modules and lessons for primary path to compute progress & current lesson
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index, lessons(id, title, order_index, description)')
    .eq('learning_path_id', primaryPath.id)
    .order('order_index', { ascending: true });

  const allLessons: any[] = [];
  let currentModuleTitle = 'Module 1';
  let currentLessonTitle = 'Lesson 1.1';

  (modules || []).forEach((m: any) => {
    (m.lessons || []).forEach((l: any) => {
      allLessons.push({
        ...l,
        moduleId: m.id,
        moduleTitle: m.title,
      });
    });
  });

  const lessonIds = allLessons.map((l) => l.id);

  const { data: progressRows } = lessonIds.length > 0
    ? await supabase
        .from('user_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds)
    : { data: [] };

  const completedLessonSet = new Set(
    (progressRows || []).filter((p: any) => p.is_completed).map((p: any) => p.lesson_id)
  );

  const totalLessons = allLessons.length;
  const completedLessons = completedLessonSet.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Identify current active lesson
  const firstUncompleted = allLessons.find((l) => !completedLessonSet.has(l.id));
  if (firstUncompleted) {
    currentModuleTitle = firstUncompleted.moduleTitle || 'Current Module';
    currentLessonTitle = firstUncompleted.title || 'Current Lesson';
  } else if (allLessons.length > 0) {
    currentModuleTitle = allLessons[allLessons.length - 1].moduleTitle;
    currentLessonTitle = allLessons[allLessons.length - 1].title;
  }

  // 5. Extract Knowledge Gaps from snapshot mastery & blocked concepts
  const knowledgeGaps: ResearchKnowledgeGap[] = [];
  const rawMastery = snapshot?.mastery || [];

  rawMastery.forEach((m: any) => {
    if (m.questionsAttempted > 0 && (m.masteryScore < 70 || m.reviewNeeded)) {
      const isBlocked = (snapshot?.blockedConcepts || []).includes(m.concept);
      let gapReason = 'Low mastery score';
      if (m.reviewNeeded) gapReason = 'Memory decay detected';
      if (isBlocked) gapReason = 'Blocks prerequisite concept';

      knowledgeGaps.push({
        concept: m.concept,
        masteryScore: m.masteryScore,
        effectiveMasteryScore: m.effectiveMasteryScore,
        hasDecay: m.reviewNeeded,
        isBlocked,
        reason: gapReason,
        learningPathId: primaryPath.id,
      });
    }
  });

  // 6. Generate Deterministic Research Recommendations
  const recommendations: ResearchRecommendation[] = [];

  // A. Mastery Gap Recommendations
  knowledgeGaps.slice(0, 3).forEach((gap, idx) => {
    const isDecay = gap.hasDecay;
    const isBlocked = gap.isBlocked;
    const recType: ResearchRecommendationType = isDecay
      ? 'MEMORY_DECAY'
      : isBlocked
      ? 'BLOCKED_PREREQUISITE'
      : 'MASTERY_GAP';

    const scored = scoreRecommendation({
      isMasteryGap: true,
      hasMemoryDecay: isDecay,
      isBlockedPrereq: isBlocked,
    });

    const topicClean = gap.concept.replace(/^Lesson \d+\.\d+:\s*/i, '').trim();

    recommendations.push({
      id: `rec-gap-${idx}`,
      topic: `${topicClean} Literature & Concepts`,
      searchQuery: `Explain ${topicClean} in computer science research`,
      reason: gap.reason,
      reasonsList: scored.reasonsList,
      priority: scored.priority,
      score: scored.score,
      recommendationType: recType,
      relatedConcept: gap.concept,
      relatedLearningPathId: primaryPath.id,
      relatedLearningPathTitle: primaryPath.title,
    });
  });

  // B. Next Lesson Recommendation
  if (nextBestAction && nextBestAction.targetLessonTitle) {
    const cleanLessonTitle = nextBestAction.targetLessonTitle.replace(/^Lesson \d+\.\d+:\s*/i, '').trim();
    const scored = scoreRecommendation({
      isNextLesson: true,
      hasRecentResearchRelation: false,
    });

    recommendations.push({
      id: 'rec-next-lesson',
      topic: `${cleanLessonTitle} Research Overview`,
      searchQuery: `Research preprints on ${cleanLessonTitle}`,
      reason: `Prepares for your next lesson: "${cleanLessonTitle}"`,
      reasonsList: scored.reasonsList,
      priority: scored.priority,
      score: scored.score,
      recommendationType: 'NEXT_LESSON',
      relatedLearningPathId: primaryPath.id,
      relatedLearningPathTitle: primaryPath.title,
      relatedLessonId: nextBestAction.targetLessonId,
      relatedLessonTitle: nextBestAction.targetLessonTitle,
    });
  }

  // C. Research Depth Detection (Check if user has 2+ research papers on same core key)
  const topicCounts = new Map<string, number>();
  researchDocs.forEach((d: any) => {
    const key = normalizeTopicKey(d.query || d.title);
    topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
  });

  const deepTopicKey = Array.from(topicCounts.entries()).find(([_, count]) => count >= 2)?.[0];
  if (deepTopicKey) {
    const scored = scoreRecommendation({
      hasRecentResearchRelation: true,
    });

    recommendations.push({
      id: 'rec-depth-1',
      topic: `Comparative Analysis: Advanced ${deepTopicKey.toUpperCase()}`,
      searchQuery: `Compare advanced algorithms in ${deepTopicKey}`,
      reason: `You've explored multiple papers on ${deepTopicKey}. A comparative research question can synthesize them.`,
      reasonsList: ['Deep topic exploration detected', 'Builds on recent research'],
      priority: scored.priority,
      score: scored.score,
      recommendationType: 'RESEARCH_DEPTH',
    });
  }

  // E. Literature Review Opportunity (Check if user has >= 2 saved research documents)
  if (researchDocs.length >= 2) {
    const scored = scoreRecommendation({
      hasRecentResearchRelation: true,
    });

    recommendations.push({
      id: 'rec-lit-review',
      topic: 'Multi-Source Literature Review Synthesis',
      searchQuery: 'Synthesize saved research investigations into a Literature Review',
      reason: `CYRA found ${researchDocs.length} saved research investigations in your library. A literature review can consolidate your findings.`,
      reasonsList: ['Multiple saved research briefs found', 'Consolidates literature themes'],
      priority: scored.priority,
      score: scored.score + 10,
      recommendationType: 'LITERATURE_REVIEW' as any,
    });
  }

  // F. Sort recommendations by score descending
  recommendations.sort((a, b) => b.score - a.score);

  // 7. Learning Connections Overview
  const learningConnections: ResearchLearningConnection[] = activePaths.map((p: any) => {
    const linkedCount = researchDocs.filter((d: any) => d.learning_path_id === p.id).length;
    const topRec = recommendations.find((r) => r.relatedLearningPathId === p.id) || null;

    return {
      learningPathId: p.id,
      learningPathTitle: p.title,
      progressPercent: p.id === primaryPath.id ? progressPercent : 0,
      exploredTopicsCount: linkedCount,
      linkedBriefsCount: linkedCount,
      knowledgeGapsCount: p.id === primaryPath.id ? knowledgeGaps.length : 0,
      topRecommendation: topRec,
    };
  });

  return {
    hasLearningHistory: true,
    currentLearningPath: {
      id: primaryPath.id,
      title: primaryPath.title,
      currentModuleTitle,
      currentLessonTitle,
      progressPercent,
      completedLessons,
      totalLessons,
    },
    knowledgeGaps,
    recommendations,
    recentActivity,
    learningConnections,
  };
}
