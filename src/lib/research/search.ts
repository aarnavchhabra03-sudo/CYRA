import { searchArXiv, RawArXivSource } from './arxiv';
import { searchTavily, TavilySearchResult } from '@/lib/search/tavily';
import { extractDomain, sanitizeUrl } from '@/lib/search/quality-engine';
import { generateProviderQueries } from './query';
import { evaluateResearchSource, deduplicateResearchSources } from './ranking';
import { ResearchSource, ResearchSearchResponse, ProviderStatus, SourceType } from './types';

/**
 * Orchestrates research search across ArXiv and Tavily with intent analysis and multi-signal ranking
 */
export async function executeResearchSearch(
  query: string,
  filter: 'all' | 'academic' | 'arxiv' | 'web' = 'all',
  sortBy: 'relevance' | 'newest' = 'relevance'
): Promise<ResearchSearchResponse> {
  if (!query || !query.trim()) {
    return {
      query: '',
      intent: 'general',
      results: [],
      sources: { arxiv: 0, academic: 0, web: 0 },
      providerStatus: { arxiv: 'ok', tavily: 'ok' },
      totalCount: 0,
    };
  }

  // 1. Analyze query intent and build provider-tailored queries
  const { rawQuery, intent, arxivQuery, tavilyQuery } = generateProviderQueries(query);

  const providerStatus: ProviderStatus = {
    arxiv: 'ok',
    tavily: 'ok',
  };

  // 2. Execute provider calls in parallel with independent failure tolerance
  const [arxivRawResults, tavilyRawResults] = await Promise.all([
    searchArXiv(arxivQuery, 10).catch((err) => {
      console.warn('[RESEARCH ENGINE] ArXiv provider error:', err);
      providerStatus.arxiv = 'failed';
      return [] as RawArXivSource[];
    }),
    searchTavily(tavilyQuery, 10).catch((err) => {
      console.warn('[RESEARCH ENGINE] Tavily provider error:', err);
      providerStatus.tavily = 'failed';
      return [] as TavilySearchResult[];
    }),
  ]);

  // 3. Process and evaluate ArXiv candidates
  const evaluatedArxiv: ResearchSource[] = arxivRawResults.map((raw) =>
    evaluateResearchSource(
      {
        id: raw.id,
        title: raw.title,
        url: raw.url,
        description: raw.description,
        authors: raw.authors,
        publishedAt: raw.publishedAt,
        source: 'ArXiv',
        domain: 'arxiv.org',
        sourceType: 'arxiv',
        arxivId: raw.arxivId,
        categories: raw.categories,
      },
      rawQuery,
      intent
    )
  );

  // 4. Process and evaluate Tavily candidates
  const evaluatedTavily: ResearchSource[] = [];
  tavilyRawResults.forEach((item, idx) => {
    const cleanUrl = sanitizeUrl(item.url);
    if (!cleanUrl) return;

    const domain = extractDomain(cleanUrl);
    const isAcademic =
      domain.endsWith('.edu') ||
      domain.endsWith('.gov') ||
      domain.includes('nature.com') ||
      domain.includes('sciencedirect.com') ||
      domain.includes('ncbi.nlm.nih.gov') ||
      domain.includes('ieee.org') ||
      domain.includes('acm.org') ||
      domain.includes('arxiv.org');

    const sourceType: SourceType = isAcademic ? 'academic' : 'web';

    const evaluated = evaluateResearchSource(
      {
        id: `tavily-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        title: item.title || 'Scholarly Resource',
        url: cleanUrl,
        description: item.content || 'No summary available for this resource.',
        source: domain,
        domain: domain.toLowerCase(),
        sourceType,
      },
      rawQuery,
      intent
    );

    evaluatedTavily.push(evaluated);
  });

  // 5. Merge and deduplicate candidates using multi-signal winner selection
  const rawCombined = [...evaluatedArxiv, ...evaluatedTavily];
  const deduplicated = deduplicateResearchSources(rawCombined);

  // 6. Calculate category source counts
  const counts = {
    arxiv: deduplicated.filter((r) => r.sourceType === 'arxiv').length,
    academic: deduplicated.filter((r) => r.sourceType === 'academic').length,
    web: deduplicated.filter((r) => r.sourceType === 'web').length,
  };

  // 7. Apply UI Category Filter
  let filtered = deduplicated;
  if (filter === 'arxiv') {
    filtered = deduplicated.filter((r) => r.sourceType === 'arxiv');
  } else if (filter === 'academic') {
    filtered = deduplicated.filter((r) => r.sourceType === 'academic' || r.sourceType === 'arxiv');
  } else if (filter === 'web') {
    filtered = deduplicated.filter((r) => r.sourceType === 'web');
  }

  // 8. Apply Sorting
  if (sortBy === 'newest') {
    filtered.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  } else {
    // Sort by relevance score descending
    filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  return {
    query: rawQuery,
    intent,
    results: filtered,
    sources: counts,
    providerStatus,
    totalCount: filtered.length,
  };
}
