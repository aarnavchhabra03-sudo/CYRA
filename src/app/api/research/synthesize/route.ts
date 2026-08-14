import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';
import { buildResearchSynthesisPrompt, SYSTEM_SYNTHESIS_INSTRUCTION } from '@/lib/research/synthesis-prompt';
import {
  ResearchSource,
  ResearchBrief,
  ResearchCitation,
  ResearchFinding,
  ResearchSourceAgreement,
  ResearchSourceDisagreement,
} from '@/lib/research/types';

export async function POST(request: Request) {
  console.log('[RESEARCH SYNTHESIZE API] Synthesis request received');

  // 1. Authenticate User Session
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.warn('[RESEARCH SYNTHESIZE API] Auth required');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required for Research Synthesis.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
  } catch (err) {
    console.warn('[RESEARCH SYNTHESIZE API] Auth exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Parse & Validate Payload
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

  const { query, sources } = body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'A valid research query is required.',
        code: 'INVALID_QUERY',
      },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || trimmedQuery.length > 500) {
    return NextResponse.json(
      {
        success: false,
        error: 'Query length must be between 2 and 500 characters.',
        code: 'INVALID_QUERY_LENGTH',
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'At least one retrieved research source is required for synthesis.',
        code: 'EMPTY_SOURCES',
      },
      { status: 400 }
    );
  }

  // Bound source count strictly to max 8
  const validSources: ResearchSource[] = sources
    .slice(0, 8)
    .filter((s: any) => s && typeof s.id === 'string' && typeof s.title === 'string');

  if (validSources.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'No valid ResearchSource objects provided.',
        code: 'INVALID_SOURCES',
      },
      { status: 400 }
    );
  }

  // 3. Build Grounded Prompt & Invoke AI Provider
  try {
    const prompt = buildResearchSynthesisPrompt(trimmedQuery, validSources);
    const aiProvider = getAIProvider();

    const result = await aiProvider.generateContent({
      prompt,
      systemInstruction: SYSTEM_SYNTHESIS_INSTRUCTION,
      temperature: 0.2,
      maxTokens: 2500,
      responseFormat: 'json',
    });

    const responseText = result.message || '';

    if (!result.success || !responseText.trim()) {
      throw new Error(result.error || 'AI Provider returned empty response text.');
    }

    // 4. Parse JSON Response safely
    let cleanJson = responseText.trim();
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    let rawBrief: any;
    try {
      rawBrief = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[RESEARCH SYNTHESIZE API] Failed to parse model JSON:', cleanJson);
      throw new Error('AI Provider returned invalid JSON formatting.');
    }

    // 5. Strict Citation Validation & Sanitization
    const validSourceMap = new Map<string, ResearchSource>();
    validSources.forEach((s) => validSourceMap.set(s.id, s));

    const referencedSourceIds = new Set<string>();

    const filterCitationIds = (ids: any): string[] => {
      if (!Array.isArray(ids)) return [];
      const valid = ids.filter((id) => typeof id === 'string' && validSourceMap.has(id));
      valid.forEach((id) => referencedSourceIds.add(id));
      return valid;
    };

    // Sanitize Key Findings
    const keyFindings: ResearchFinding[] = Array.isArray(rawBrief.keyFindings)
      ? rawBrief.keyFindings
          .map((f: any) => ({
            title: String(f.title || 'Key Finding'),
            explanation: String(f.explanation || ''),
            citationIds: filterCitationIds(f.citationIds),
          }))
          .filter((f: ResearchFinding) => f.explanation.length > 0)
      : [];

    // Sanitize Source Agreement
    const sourceAgreement: ResearchSourceAgreement[] = Array.isArray(rawBrief.sourceAgreement)
      ? rawBrief.sourceAgreement
          .map((a: any) => ({
            statement: String(a.statement || ''),
            citationIds: filterCitationIds(a.citationIds),
          }))
          .filter((a: ResearchSourceAgreement) => a.statement.length > 0)
      : [];

    // Sanitize Source Differences
    const sourceDifferences: ResearchSourceDisagreement[] = Array.isArray(rawBrief.sourceDifferences)
      ? rawBrief.sourceDifferences
          .map((d: any) => ({
            statement: String(d.statement || ''),
            citationIds: filterCitationIds(d.citationIds),
          }))
          .filter((d: ResearchSourceDisagreement) => d.statement.length > 0)
      : [];

    // Build Citations Array mapping valid referenced source IDs to citation indices
    const citationList: ResearchCitation[] = [];
    const idToCitationMap = new Map<string, ResearchCitation>();

    // Add referenced sources first
    Array.from(referencedSourceIds).forEach((id) => {
      const source = validSourceMap.get(id);
      if (source) {
        const citation: ResearchCitation = {
          id: source.id,
          index: citationList.length + 1,
          sourceId: source.id,
          title: source.title,
          source: source.source,
          domain: source.domain,
          url: source.url,
          authors: source.authors,
          publishedAt: source.publishedAt,
        };
        citationList.push(citation);
        idToCitationMap.set(source.id, citation);
      }
    });

    // If no citations were explicitly linked, include all supplied sources as citations
    if (citationList.length === 0) {
      validSources.forEach((source) => {
        const citation: ResearchCitation = {
          id: source.id,
          index: citationList.length + 1,
          sourceId: source.id,
          title: source.title,
          source: source.source,
          domain: source.domain,
          url: source.url,
          authors: source.authors,
          publishedAt: source.publishedAt,
        };
        citationList.push(citation);
      });
    }

    // Sanitize Practical Takeaways
    const practicalTakeaways: string[] = Array.isArray(rawBrief.practicalTakeaways)
      ? rawBrief.practicalTakeaways.map((t: any) => String(t)).filter((t: string) => t.trim().length > 0)
      : [];

    // Sanitize Suggested Learning Topics (Bound to 2-5 items)
    const suggestedTopics: string[] = Array.isArray(rawBrief.suggestedLearningTopics)
      ? rawBrief.suggestedLearningTopics
          .map((t: any) => String(t).trim())
          .filter((t: string) => t.length > 0)
          .slice(0, 5)
      : [];

    const finalBrief: ResearchBrief = {
      title: String(rawBrief.title || `Research Brief: ${trimmedQuery}`),
      executiveSummary: String(
        rawBrief.executiveSummary ||
          'A synthesis of retrieved literature based on the available research sources.'
      ),
      keyFindings,
      sourceAgreement,
      sourceDifferences,
      practicalTakeaways,
      suggestedLearningTopics: suggestedTopics,
      citations: citationList,
      generatedAt: new Date().toISOString(),
    };

    console.log('[RESEARCH SYNTHESIZE API] Synthesis successfully generated');

    return NextResponse.json({
      success: true,
      data: finalBrief,
    });
  } catch (err: any) {
    console.error('[RESEARCH SYNTHESIZE API] Synthesis error:', err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: "CYRA couldn't complete the research synthesis. Please try again.",
        code: 'SYNTHESIS_FAILED',
      },
      { status: 502 }
    );
  }
}
