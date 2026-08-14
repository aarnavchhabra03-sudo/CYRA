import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeResearchSearch } from '@/lib/research/search';

export async function POST(request: Request) {
  console.log('[RESEARCH API] Search POST request received');

  // 1. Authenticate User Session
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.warn('[RESEARCH API] Auth required for search');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to access Research Lab.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
  } catch (err) {
    console.warn('[RESEARCH API] Auth exception:', err);
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

  const { query, filter, sortBy } = body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'A search query is required.',
        code: 'INVALID_QUERY',
      },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return NextResponse.json(
      {
        success: false,
        error: 'Query must be at least 2 characters long.',
        code: 'QUERY_TOO_SHORT',
      },
      { status: 400 }
    );
  }

  if (trimmedQuery.length > 500) {
    return NextResponse.json(
      {
        success: false,
        error: 'Query must not exceed 500 characters.',
        code: 'QUERY_TOO_LONG',
      },
      { status: 400 }
    );
  }

  // Validate filter & sortBy parameters
  const validFilters = ['all', 'academic', 'arxiv', 'web'];
  const validSorts = ['relevance', 'newest'];

  const activeFilter = validFilters.includes(filter) ? filter : 'all';
  const activeSort = validSorts.includes(sortBy) ? sortBy : 'relevance';

  // 3. Execute Research Search
  try {
    const searchResponse = await executeResearchSearch(trimmedQuery, activeFilter, activeSort);

    console.log(
      `[RESEARCH API] Search completed for "${trimmedQuery}". Total results: ${searchResponse.totalCount} (ArXiv: ${searchResponse.sources.arxiv}, Academic: ${searchResponse.sources.academic}, Web: ${searchResponse.sources.web})`
    );

    return NextResponse.json({
      success: true,
      data: searchResponse,
    });
  } catch (error: any) {
    console.error('[RESEARCH API] Search execution failure:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: "Research couldn't reach the source providers. Please try again.",
        code: 'SEARCH_PROVIDER_ERROR',
      },
      { status: 502 }
    );
  }
}
