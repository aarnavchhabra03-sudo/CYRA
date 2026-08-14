import { ResearchSource } from './types';

export type RawArXivSource = Omit<ResearchSource, 'evidenceLevel' | 'whySourceReasons'>;

/**
 * Clean string formatting helper (strips XML tags, extra whitespace, newlines)
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses ArXiv Atom XML feed using string/regex manipulation
 */
export function parseArXivXml(xml: string): RawArXivSource[] {
  if (!xml || typeof xml !== 'string') return [];

  const results: RawArXivSource[] = [];
  const entries = xml.split('<entry>');

  // Skip header chunk (index 0)
  for (let i = 1; i < entries.length; i++) {
    const chunk = entries[i].split('</entry>')[0];
    if (!chunk) continue;

    // Extract Title
    const titleMatch = chunk.match(/<title>([\s\S]*?)<\/title>/);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const title = cleanText(rawTitle);

    if (!title) continue;

    // Extract Abstract / Summary
    const summaryMatch = chunk.match(/<summary>([\s\S]*?)<\/summary>/);
    const rawSummary = summaryMatch ? summaryMatch[1] : '';
    const description = cleanText(rawSummary);

    // Extract ID and ArXiv ID
    const idMatch = chunk.match(/<id>([\s\S]*?)<\/id>/);
    const rawIdUrl = idMatch ? cleanText(idMatch[1]) : '';

    // ArXiv ID extraction (e.g. 2301.12345 or abs/2301.12345)
    let arxivId = '';
    const arxivIdMatch = rawIdUrl.match(/abs\/([^\s\/]+)/) || rawIdUrl.match(/arxiv.org\/abs\/([^\s]+)/);
    if (arxivIdMatch) {
      arxivId = arxivIdMatch[1];
    }

    // Extract URL (prefers alternate html/pdf link or falls back to rawIdUrl)
    let url = rawIdUrl;
    const linkMatch = chunk.match(/<link[^>]+href="([^"]+)"[^>]+rel="alternate"/i) ||
                     chunk.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i) ||
                     chunk.match(/<link[^>]+href="([^"]+)"/i);
    if (linkMatch && linkMatch[1]) {
      url = linkMatch[1];
    }

    // Extract Authors
    const authors: string[] = [];
    const authorMatches = chunk.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi);
    for (const match of authorMatches) {
      if (match[1]) {
        authors.push(cleanText(match[1]));
      }
    }

    // Extract Publication Date
    const publishedMatch = chunk.match(/<published>([\s\S]*?)<\/published>/);
    let publishedAt = '';
    if (publishedMatch && publishedMatch[1]) {
      const dateStr = cleanText(publishedMatch[1]);
      try {
        publishedAt = new Date(dateStr).toISOString().split('T')[0];
      } catch {
        publishedAt = dateStr;
      }
    }

    // Extract Categories
    const categories: string[] = [];
    const categoryMatches = chunk.matchAll(/<category[^>]+term="([^"]+)"/gi);
    for (const match of categoryMatches) {
      if (match[1]) {
        categories.push(cleanText(match[1]));
      }
    }

    results.push({
      id: `arxiv-${arxivId || Math.random().toString(36).substring(2, 9)}`,
      title,
      url,
      description,
      authors: authors.length > 0 ? authors : ['ArXiv Researcher'],
      publishedAt: publishedAt || new Date().toISOString().split('T')[0],
      source: 'ArXiv',
      domain: 'arxiv.org',
      relevanceScore: 85,
      sourceType: 'arxiv',
      arxivId: arxivId || undefined,
      categories: categories.length > 0 ? categories : undefined,
    });
  }

  return results;
}

/**
 * Searches ArXiv REST API for research papers matching query
 */
export async function searchArXiv(query: string, maxResults = 8): Promise<RawArXivSource[]> {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim().replace(/[^\w\s]/gi, ' ');
  const targetUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(cleanQuery)}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'CYRA-AI-ResearchEngine/1.0 (https://cyra.ai)',
        'Accept': 'application/atom+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[ARXIV SEARCH] ArXiv API returned HTTP status ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseArXivXml(xml);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn('[ARXIV SEARCH] Request timed out after 6 seconds.');
    } else {
      console.warn('[ARXIV SEARCH] ArXiv request exception (failing open):', error?.message || error);
    }
    return [];
  }
}
