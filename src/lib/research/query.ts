import { ResearchIntent } from './types';

/**
 * Deterministically classifies a user's research query into an intent category
 */
export function classifyResearchIntent(query: string): ResearchIntent {
  if (!query || typeof query !== 'string') return 'general';

  const q = query.trim().toLowerCase();

  // 1. Comparison Intent
  if (
    /\b(compare|vs\b|versus|difference\s+between|compared\s+to|pros\s+and\s+cons|advantages\s+and\s+disadvantages)\b/i.test(q)
  ) {
    return 'comparison';
  }

  // 2. Current Research Intent
  if (
    /\b(latest\s+research|recent\s+advances|state\s+of\s+the\s+art|sota|newest\s+papers|current\s+trends|future\s+directions)\b/i.test(q)
  ) {
    return 'current_research';
  }

  // 3. Literature Review Intent
  if (
    /\b(survey\s+of|literature\s+review|meta\s+analysis|systematic\s+review|overview\s+of\s+papers)\b/i.test(q)
  ) {
    return 'literature_review';
  }

  // 4. Implementation Intent
  if (
    /\b(how\s+to\s+implement|code\s+for|algorithm\s+for|implementation\s+of|building\s+a|architecture\s+impl)\b/i.test(q)
  ) {
    return 'implementation';
  }

  // 5. Historical Intent
  if (
    /\b(history\s+of|origin\s+of|evolution\s+of|timeline\s+of|who\s+invented|first\s+proposed)\b/i.test(q)
  ) {
    return 'historical';
  }

  // 6. Troubleshooting Intent
  if (
    /\b(how\s+to\s+fix|common\s+errors\s+in|debugging|troubleshooting|issue\s+with|failed\s+to)\b/i.test(q)
  ) {
    return 'troubleshooting';
  }

  // 7. Definition Intent
  if (
    /\b(what\s+is|what\s+are|define|meaning\s+of|concept\s+of|definition\s+of)\b/i.test(q)
  ) {
    return 'definition';
  }

  // 8. Explanation Intent
  if (
    /\b(how\s+does|why\s+does|explain|mechanism\s+behind|how\s+works|principle\s+of)\b/i.test(q)
  ) {
    return 'explanation';
  }

  return 'general';
}

export interface PreparedQueries {
  rawQuery: string;
  intent: ResearchIntent;
  arxivQuery: string;
  tavilyQuery: string;
}

/**
 * Generates provider-specific normalized search queries based on research intent
 */
export function generateProviderQueries(userQuery: string): PreparedQueries {
  const rawQuery = userQuery ? userQuery.trim() : '';
  const intent = classifyResearchIntent(rawQuery);

  // Strip common introductory stop-phrases for ArXiv search API
  let coreKeywords = rawQuery
    .replace(/^what\s+is\s+(a\s+|an\s+|the\s+)?/i, '')
    .replace(/^what\s+are\s+(the\s+)?/i, '')
    .replace(/^explain\s+(how\s+)?(the\s+)?/i, '')
    .replace(/^compare\s+/i, '')
    .replace(/^latest\s+research\s+(on\s+)?/i, '')
    .replace(/^how\s+does\s+(the\s+)?/i, '')
    .replace(/^how\s+to\s+implement\s+/i, '')
    .replace(/^history\s+of\s+/i, '')
    .trim();

  if (!coreKeywords) {
    coreKeywords = rawQuery;
  }

  // Clean ArXiv query (pure keywords)
  const arxivQuery = coreKeywords;

  // Build targeted Tavily web search query
  let tavilyQuery = coreKeywords;
  if (intent === 'current_research' || intent === 'literature_review') {
    tavilyQuery = `${coreKeywords} research paper study`;
  } else if (intent === 'comparison') {
    tavilyQuery = `${coreKeywords} comparison study paper`;
  } else if (intent === 'definition' || intent === 'explanation') {
    tavilyQuery = `${coreKeywords} research paper`;
  }

  return {
    rawQuery,
    intent,
    arxivQuery,
    tavilyQuery,
  };
}
