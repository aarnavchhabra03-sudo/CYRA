import { getAIProvider } from '@/lib/ai/provider';
import { ResearchBrief } from './types';
import { LearningPathGeneration, DifficultyLevel } from '@/types/ai';

export interface ResearchContextPayload {
  topic: string;
  goal: string;
  learningTopics: string[];
  keyFindings: string[];
  sourceReferences: string[];
}

/**
 * Builds a bounded, sanitized research context object from a ResearchBrief
 */
export function buildResearchContext(brief: ResearchBrief): ResearchContextPayload {
  const topic = (brief.title || 'Research Topic')
    .replace(/^Research Brief:\s*/i, '')
    .substring(0, 150)
    .trim();

  const goal = (brief.executiveSummary || 'Master concepts derived from academic literature.')
    .substring(0, 300)
    .trim();

  const learningTopics = (brief.suggestedLearningTopics || [])
    .slice(0, 5)
    .map((t) => String(t).substring(0, 80).trim())
    .filter((t) => t.length > 0);

  const keyFindings = (brief.keyFindings || [])
    .slice(0, 8)
    .map((f) => `${f.title}: ${f.explanation}`.substring(0, 250).trim())
    .filter((f) => f.length > 0);

  const sourceReferences = (brief.citations || [])
    .slice(0, 8)
    .map((c) => `${c.title} (${c.source})`.substring(0, 120).trim())
    .filter((c) => c.length > 0);

  return {
    topic,
    goal,
    learningTopics,
    keyFindings,
    sourceReferences,
  };
}

/**
 * Generates a structured CYRA curriculum from a ResearchBrief using the existing AI Provider
 */
export async function generateCurriculumFromResearch(
  brief: ResearchBrief,
  options?: {
    experienceLevel?: DifficultyLevel;
    minutesPerDay?: number;
  }
): Promise<{ success: boolean; data?: LearningPathGeneration; error?: string; code?: string }> {
  if (!brief || !brief.title || !brief.executiveSummary) {
    return {
      success: false,
      error: 'Invalid ResearchBrief structure provided.',
      code: 'INVALID_RESEARCH_BRIEF',
    };
  }

  const context = buildResearchContext(brief);
  const experienceLevel = options?.experienceLevel || 'intermediate';
  const minutesPerDay = options?.minutesPerDay || 30;

  // Build targeted topic prompt incorporating isolated research context
  const enrichedTopic = `${context.topic} (Grounded in academic literature and research findings)`;
  const enrichedGoal = `${context.goal} Core concepts to cover: ${context.learningTopics.join(', ')}`;

  try {
    const provider = getAIProvider();

    // Call existing provider curriculum generator
    const result = await provider.generateLearningPath({
      topic: enrichedTopic,
      experienceLevel,
      goal: enrichedGoal,
      minutesPerDay,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to generate curriculum from research brief.',
        code: result.code || 'AI_GENERATION_FAILED',
      };
    }

    // Ensure title remains clean
    const cleanCurriculum: LearningPathGeneration = {
      ...result.data,
      title: context.topic,
    };

    return {
      success: true,
      data: cleanCurriculum,
    };
  } catch (err: any) {
    console.error('[generateCurriculumFromResearch] Exception:', err);
    return {
      success: false,
      error: 'An error occurred while building the curriculum.',
      code: 'CURRICULUM_GENERATION_FAILED',
    };
  }
}
