import { ResearchBrief } from './types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedBrief?: ResearchBrief;
}

/**
 * Validates and normalizes a ResearchBrief structure prior to database persistence
 */
export function validateResearchBriefForPersistence(brief: any): ValidationResult {
  if (!brief || typeof brief !== 'object') {
    return { valid: false, error: 'ResearchBrief payload must be a non-null object.' };
  }

  // 1. Title Validation (1 - 300 chars)
  const title = typeof brief.title === 'string' ? brief.title.trim() : '';
  if (!title || title.length < 1 || title.length > 300) {
    return { valid: false, error: 'ResearchBrief title must be between 1 and 300 characters long.' };
  }

  // 2. Executive Summary Validation (1 - 6000 chars)
  const executiveSummary = typeof brief.executiveSummary === 'string' ? brief.executiveSummary.trim() : '';
  if (!executiveSummary || executiveSummary.length < 1 || executiveSummary.length > 6000) {
    return { valid: false, error: 'ResearchBrief executive summary must be between 1 and 6000 characters long.' };
  }

  // 3. Key Findings Validation (Array, Max 8 items)
  if (!Array.isArray(brief.keyFindings)) {
    return { valid: false, error: 'ResearchBrief keyFindings must be an array.' };
  }

  if (brief.keyFindings.length > 8) {
    return { valid: false, error: 'ResearchBrief keyFindings cannot exceed 8 items.' };
  }

  const sanitizedFindings = brief.keyFindings
    .map((f: any) => {
      if (!f || typeof f !== 'object') return null;
      const fTitle = typeof f.title === 'string' ? f.title.trim().substring(0, 200) : 'Key Finding';
      const fExpl = typeof f.explanation === 'string' ? f.explanation.trim().substring(0, 5000) : '';
      const fCitations = Array.isArray(f.citationIds)
        ? f.citationIds.filter((c: any) => typeof c === 'string').map((c: string) => c.trim().substring(0, 100))
        : [];
      return { title: fTitle, explanation: fExpl, citationIds: fCitations };
    })
    .filter((f: any) => f !== null && f.explanation.length > 0);

  // 4. Source Agreement & Differences Validation
  const sanitizedAgreement = Array.isArray(brief.sourceAgreement)
    ? brief.sourceAgreement
        .map((a: any) => ({
          statement: typeof a.statement === 'string' ? a.statement.trim().substring(0, 1000) : '',
          citationIds: Array.isArray(a.citationIds)
            ? a.citationIds.filter((c: any) => typeof c === 'string').map((c: string) => c.trim().substring(0, 100))
            : [],
        }))
        .filter((a: any) => a.statement.length > 0)
        .slice(0, 8)
    : [];

  const sanitizedDifferences = Array.isArray(brief.sourceDifferences)
    ? brief.sourceDifferences
        .map((d: any) => ({
          statement: typeof d.statement === 'string' ? d.statement.trim().substring(0, 1000) : '',
          citationIds: Array.isArray(d.citationIds)
            ? d.citationIds.filter((c: any) => typeof c === 'string').map((c: string) => c.trim().substring(0, 100))
            : [],
        }))
        .filter((d: any) => d.statement.length > 0)
        .slice(0, 8)
    : [];

  // 5. Practical Takeaways & Suggested Topics Validation
  const sanitizedTakeaways = Array.isArray(brief.practicalTakeaways)
    ? brief.practicalTakeaways
        .filter((t: any) => typeof t === 'string')
        .map((t: string) => t.trim().substring(0, 500))
        .filter((t: string) => t.length > 0)
        .slice(0, 10)
    : [];

  const sanitizedTopics = Array.isArray(brief.suggestedLearningTopics)
    ? brief.suggestedLearningTopics
        .filter((t: any) => typeof t === 'string')
        .map((t: string) => t.trim().substring(0, 100))
        .filter((t: string) => t.length > 0)
        .slice(0, 5)
    : [];

  // 6. Citations Validation (Max 8 items)
  if (!Array.isArray(brief.citations)) {
    return { valid: false, error: 'ResearchBrief citations must be an array.' };
  }

  if (brief.citations.length > 8) {
    return { valid: false, error: 'ResearchBrief citations cannot exceed 8 items.' };
  }

  const sanitizedCitations = brief.citations
    .map((c: any, idx: number) => {
      if (!c || typeof c !== 'object') return null;
      return {
        id: typeof c.id === 'string' ? c.id.trim().substring(0, 100) : `citation-${idx + 1}`,
        index: typeof c.index === 'number' ? c.index : idx + 1,
        sourceId: typeof c.sourceId === 'string' ? c.sourceId.trim().substring(0, 100) : `source-${idx + 1}`,
        title: typeof c.title === 'string' ? c.title.trim().substring(0, 300) : 'Untitled Resource',
        source: typeof c.source === 'string' ? c.source.trim().substring(0, 100) : 'Web',
        domain: typeof c.domain === 'string' ? c.domain.trim().substring(0, 100) : 'unknown',
        url: typeof c.url === 'string' ? c.url.trim().substring(0, 1000) : '',
        authors: Array.isArray(c.authors)
          ? c.authors.filter((a: any) => typeof a === 'string').map((a: string) => a.trim().substring(0, 100))
          : undefined,
        publishedAt: typeof c.publishedAt === 'string' ? c.publishedAt.trim().substring(0, 50) : undefined,
      };
    })
    .filter((c: any) => c !== null && c.url.length > 0);

  const sanitizedBrief: ResearchBrief = {
    title,
    executiveSummary,
    keyFindings: sanitizedFindings,
    sourceAgreement: sanitizedAgreement,
    sourceDifferences: sanitizedDifferences,
    practicalTakeaways: sanitizedTakeaways,
    suggestedLearningTopics: sanitizedTopics,
    citations: sanitizedCitations,
    generatedAt: typeof brief.generatedAt === 'string' ? brief.generatedAt : new Date().toISOString(),
  };

  return {
    valid: true,
    sanitizedBrief,
  };
}
