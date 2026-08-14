import { ResearchBrief, ResearchSource, LiteratureReview, LiteratureCitation } from './types';
import { deduplicateResearchSources } from './ranking';
import { SYSTEM_LITERATURE_INSTRUCTION, buildLiteratureReviewPrompt } from './literature-prompt';

/**
 * Extracts and deduplicates sources across multiple research briefs, capping at top 12 highest-quality sources.
 */
export function collectAndDeduplicateSources(briefs: ResearchBrief[], maxSources = 12): ResearchSource[] {
  const allSources: ResearchSource[] = [];

  briefs.forEach((brief) => {
    if (brief.citations && Array.isArray(brief.citations)) {
      brief.citations.forEach((c: any) => {
        allSources.push({
          id: c.id || `src-${Math.random().toString(36).substring(2, 9)}`,
          title: c.title || 'Untitled Research Source',
          url: c.url || '#',
          description: c.description || c.snippet || c.title || 'Academic research source',
          snippet: c.snippet || c.description || c.title,
          authors: c.authors || [],
          publishedAt: c.publishedAt || c.publishedDate,
          source: c.source || c.domain || 'academic',
          domain: c.domain || 'academic',
          relevanceScore: c.relevanceScore || 80,
          authorityScore: c.authorityScore || 80,
          recencyScore: c.recencyScore || 80,
          overallScore: c.overallScore || c.authorityScore || 80,
          sourceType: c.sourceType || 'web',
          evidenceLevel: c.evidenceLevel || 'academic',
          whySourceReasons: c.whySourceReasons || ['Academic citation'],
        });
      });
    }
  });

  // Reuse existing ranking deduplication logic from ranking.ts
  const deduplicated = deduplicateResearchSources(allSources);

  // Sort by overallScore / authorityScore descending and limit to maxSources (top 12)
  return deduplicated
    .sort((a, b) => (b.overallScore || b.authorityScore || 0) - (a.overallScore || a.authorityScore || 0))
    .slice(0, maxSources);
}

/**
 * Validates, filters, and re-indexes citations returned by the AI synthesis model.
 */
export function validateLiteratureReviewCitations(
  rawReview: any,
  validSources: ResearchSource[]
): { sanitizedReview: any; citations: LiteratureCitation[] } {
  const validSourceMap = new Map<string, ResearchSource>();
  validSources.forEach((s) => validSourceMap.set(s.id, s));

  // Build sequential citation index list
  const usedSourceIds = new Set<string>();

  const filterIds = (ids: any): string[] => {
    if (!Array.isArray(ids)) return [];
    return ids.filter((id) => typeof id === 'string' && validSourceMap.has(id));
  };

  // 1. Sanitize citation IDs across all sections
  const themes = (rawReview.themes || []).map((t: any, idx: number) => {
    const validIds = filterIds(t.citationIds);
    validIds.forEach((id) => usedSourceIds.add(id));
    return {
      id: t.id || `theme-${idx + 1}`,
      theme: t.theme || 'Key Theme',
      explanation: t.explanation || '',
      citationIds: validIds,
    };
  });

  const agreements = (rawReview.agreements || []).map((a: any, idx: number) => {
    const validIds = filterIds(a.citationIds);
    validIds.forEach((id) => usedSourceIds.add(id));
    return {
      id: a.id || `agree-${idx + 1}`,
      claim: a.claim || 'Shared Consensus Claim',
      supportingSummary: a.supportingSummary || '',
      citationIds: validIds,
    };
  });

  const disagreements = (rawReview.disagreements || []).map((d: any, idx: number) => {
    const validIds = filterIds(d.citationIds);
    validIds.forEach((id) => usedSourceIds.add(id));
    return {
      id: d.id || `disagree-${idx + 1}`,
      topic: d.topic || 'Divergent Perspective',
      perspectiveA: d.perspectiveA || '',
      perspectiveB: d.perspectiveB || '',
      citationIds: validIds,
    };
  });

  const researchGaps = (rawReview.researchGaps || []).map((g: any, idx: number) => {
    const validIds = filterIds(g.supportingCitationIds);
    validIds.forEach((id) => usedSourceIds.add(id));
    return {
      id: g.id || `gap-${idx + 1}`,
      statement: g.statement || 'Identified Research Gap',
      supportingCitationIds: validIds,
    };
  });

  const openQuestions = (rawReview.openQuestions || []).map((q: any, idx: number) => {
    const validIds = filterIds(q.supportingCitationIds);
    validIds.forEach((id) => usedSourceIds.add(id));
    return {
      id: q.id || `q-${idx + 1}`,
      question: q.question || 'Grounded Research Question',
      motivation: q.motivation || '',
      supportingCitationIds: validIds,
    };
  });

  // Ensure all valid sources appear in sequential citation index
  validSources.forEach((s) => usedSourceIds.add(s.id));

  const citations: LiteratureCitation[] = Array.from(usedSourceIds)
    .map((sourceId, index) => {
      const s = validSourceMap.get(sourceId)!;
      return {
        id: s.id,
        index: index + 1,
        title: s.title,
        url: s.url,
        domain: s.domain,
        snippet: s.snippet,
        authors: s.authors,
        publishedDate: s.publishedAt,
        sourceType: s.sourceType,
        authorityScore: s.authorityScore,
      };
    })
    .filter(Boolean);

  const sanitizedReview = {
    ...rawReview,
    themes,
    agreements,
    disagreements,
    researchGaps,
    openQuestions,
    learningRecommendations: Array.isArray(rawReview.learningRecommendations)
      ? rawReview.learningRecommendations
      : ['Congestion control window dynamics', 'RTT estimation algorithms'],
  };

  return { sanitizedReview, citations };
}

/**
 * Synthesizes a multi-source literature review using an AI Provider
 */
export async function generateLiteratureReview({
  sources,
  researchQuestion,
  scope = 'comparative',
  aiProvider,
  sourceDocumentIds = [],
}: {
  sources: ResearchSource[];
  researchQuestion: string;
  scope?: 'comparative' | 'thematic' | 'general';
  aiProvider: any;
  sourceDocumentIds?: string[];
}): Promise<LiteratureReview> {
  console.log(`[LITERATURE REVIEW ENGINE] Synthesizing review for question: "${researchQuestion}" across ${sources.length} sources`);

  const prompt = buildLiteratureReviewPrompt(sources, researchQuestion, scope);

  const rawText = await aiProvider.generateText({
    systemInstruction: SYSTEM_LITERATURE_INSTRUCTION,
    prompt,
    temperature: 0.2,
  });

  // Clean JSON block markup if present
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[LITERATURE REVIEW ENGINE] JSON Parse Error:', parseErr, 'Raw:', rawText);
    throw new Error('AI Provider generated an invalid literature review response payload.');
  }

  const { sanitizedReview, citations } = validateLiteratureReviewCitations(parsed, sources);

  return {
    title: sanitizedReview.title || `Literature Review: ${researchQuestion}`,
    researchQuestion,
    executiveSummary: sanitizedReview.executiveSummary || 'Synthesis of retrieved literature.',
    scope,
    themes: sanitizedReview.themes,
    agreements: sanitizedReview.agreements,
    disagreements: sanitizedReview.disagreements,
    researchGaps: sanitizedReview.researchGaps,
    openQuestions: sanitizedReview.openQuestions,
    learningRecommendations: sanitizedReview.learningRecommendations,
    citations,
    sourceDocumentIds,
    generatedAt: new Date().toISOString(),
  };
}
