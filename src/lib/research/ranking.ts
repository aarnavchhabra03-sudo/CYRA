import { ResearchSource, EvidenceLevel, ResearchIntent } from './types';
import { calculateTitleSimilarity, extractDomain, sanitizeUrl } from '@/lib/search/quality-engine';

export const HIGH_AUTHORITY_DOMAINS = [
  'arxiv.org',
  'nature.com',
  'science.org',
  'ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'ieee.org',
  'acm.org',
  'sciencedirect.com',
  'springer.com',
  'cell.com',
  'pnas.org',
  'mit.edu',
  'stanford.edu',
  'harvard.edu',
  'berkeley.edu',
  'cmu.edu',
  'ox.ac.uk',
  'cam.ac.uk',
  'semanticscholar.org',
];

/**
 * Classifies a source's evidence level based on domain and source properties
 */
export function classifyEvidenceLevel(urlStr: string, sourceType: string): EvidenceLevel {
  if (!urlStr) return 'general';
  const urlLower = urlStr.toLowerCase();

  if (sourceType === 'arxiv' || urlLower.includes('arxiv.org')) {
    return 'primary';
  }

  if (
    urlLower.includes('doi.org') ||
    urlLower.includes('nature.com') ||
    urlLower.includes('science.org') ||
    urlLower.includes('ieee.org') ||
    urlLower.includes('acm.org') ||
    urlLower.includes('sciencedirect.com') ||
    urlLower.includes('springer.com') ||
    urlLower.includes('pnas.org')
  ) {
    return 'primary';
  }

  if (
    urlLower.includes('.edu') ||
    urlLower.includes('.gov') ||
    urlLower.includes('ncbi.nlm.nih.gov') ||
    urlLower.includes('pubmed') ||
    urlLower.includes('researchgate.net')
  ) {
    return 'academic';
  }

  if (
    urlLower.includes('wikipedia.org') ||
    urlLower.includes('geeksforgeeks.org') ||
    urlLower.includes('developer.mozilla.org') ||
    urlLower.includes('medium.com') ||
    urlLower.includes('github.com') ||
    urlLower.includes('w3schools.com')
  ) {
    return 'secondary';
  }

  return 'general';
}

function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Evaluates multi-signal relevance score (bounded 0-100) and evidence metadata
 */
export function evaluateResearchSource(
  rawItem: {
    id: string;
    title: string;
    url: string;
    description: string;
    authors?: string[];
    publishedAt?: string;
    source: string;
    domain: string;
    sourceType: 'arxiv' | 'academic' | 'web' | 'course';
    arxivId?: string;
    categories?: string[];
  },
  query: string,
  intent: ResearchIntent
): ResearchSource {
  const cleanUrl = sanitizeUrl(rawItem.url) || rawItem.url;
  const domain = extractDomain(cleanUrl);
  const evidenceLevel = classifyEvidenceLevel(cleanUrl, rawItem.sourceType);

  let score = 0;
  const whyReasons: string[] = [];

  const queryTokens = tokenize(query);
  const titleTokens = tokenize(rawItem.title);
  const descTokens = tokenize(rawItem.description);
  const candidateText = `${rawItem.title} ${rawItem.description} ${cleanUrl}`.toLowerCase();

  // 1. Authority Signal (Max 35 pts)
  const isHighAuthority = HIGH_AUTHORITY_DOMAINS.some((d) => cleanUrl.toLowerCase().includes(d));

  if (evidenceLevel === 'primary') {
    score += 35;
    whyReasons.push('Primary research');
  } else if (evidenceLevel === 'academic' || isHighAuthority) {
    score += 30;
    whyReasons.push('Academic source');
  } else if (evidenceLevel === 'secondary') {
    score += 15;
  } else {
    score += 10;
  }

  // 2. Query & Title Relevance (Max 45 pts)
  const titleMatches = queryTokens.filter((t) => titleTokens.includes(t));
  const titleRatio = queryTokens.length > 0 ? titleMatches.length / queryTokens.length : 0;

  const titleScore = Math.min(30, Math.round(titleRatio * 30));
  score += titleScore;

  const descMatches = queryTokens.filter((t) => descTokens.includes(t));
  const descRatio = queryTokens.length > 0 ? descMatches.length / queryTokens.length : 0;
  const descScore = Math.min(15, Math.round(descRatio * 15));
  score += descScore;

  if (titleRatio >= 0.5 && !whyReasons.includes('Primary research')) {
    whyReasons.push('Strong topic match');
  }

  // 3. Modest Recency Signal (Max 10 pts, only for current_research / literature_review)
  if (rawItem.publishedAt && (intent === 'current_research' || intent === 'literature_review')) {
    try {
      const pubYear = new Date(rawItem.publishedAt).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - pubYear;

      if (age <= 1) {
        score += 10;
        if (whyReasons.length < 2) whyReasons.push('Recent publication');
      } else if (age <= 3) {
        score += 5;
        if (whyReasons.length < 2) whyReasons.push('Recent publication');
      }
    } catch {
      // Unknown dates: no bonus, no penalty
    }
  }

  // 4. Metadata Completeness Signal (Max 10 pts)
  if (rawItem.authors && rawItem.authors.length > 0) {
    score += 5;
  }
  if (rawItem.publishedAt) {
    score += 5;
  }

  // Bound score strictly between 0 and 100
  const boundedScore = Math.max(0, Math.min(100, score));

  // Ensure 1-2 subtle why-reasons exist
  if (whyReasons.length === 0) {
    if (boundedScore >= 75) {
      whyReasons.push('Strong topic match');
    } else {
      whyReasons.push('Relevant resource');
    }
  }

  return {
    id: rawItem.id,
    title: rawItem.title,
    url: cleanUrl,
    description: rawItem.description,
    authors: rawItem.authors,
    publishedAt: rawItem.publishedAt,
    source: rawItem.source || domain,
    domain: domain.toLowerCase(),
    relevanceScore: boundedScore,
    sourceType: rawItem.sourceType,
    evidenceLevel,
    whySourceReasons: whyReasons.slice(0, 2),
    arxivId: rawItem.arxivId,
    categories: rawItem.categories,
  };
}

/**
 * Deduplicates candidates by canonical URL, ArXiv ID, or strong title similarity,
 * retaining the highest-scoring candidate for each duplicate cluster.
 */
export function deduplicateResearchSources(sources: ResearchSource[]): ResearchSource[] {
  if (!sources || sources.length === 0) return [];

  const deduplicatedMap = new Map<string, ResearchSource>();

  for (const item of sources) {
    // Determine key priority: 1. ArXiv ID, 2. Canonical URL, 3. Title similarity key
    let key = item.url.toLowerCase().replace(/\/$/, '');
    if (item.arxivId) {
      key = `arxiv-${item.arxivId.toLowerCase().replace(/v\d+$/, '')}`;
    }

    // Check if title matches an existing item in map
    let existingKey: string | null = null;
    for (const [k, existing] of deduplicatedMap.entries()) {
      if (calculateTitleSimilarity(existing.title, item.title) > 0.82) {
        existingKey = k;
        break;
      }
    }

    const targetKey = existingKey || key;
    const existing = deduplicatedMap.get(targetKey);

    if (!existing) {
      deduplicatedMap.set(targetKey, item);
    } else {
      // Pick winner based on higher relevance score or primary evidence level
      if (item.relevanceScore > existing.relevanceScore) {
        deduplicatedMap.set(targetKey, item);
      } else if (item.relevanceScore === existing.relevanceScore && item.evidenceLevel === 'primary') {
        deduplicatedMap.set(targetKey, item);
      }
    }
  }

  return Array.from(deduplicatedMap.values());
}
