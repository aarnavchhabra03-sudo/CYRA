import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildResearchIntelligence } from '@/lib/research/intelligence';

export async function GET(request: Request) {
  console.log('[RESEARCH INTELLIGENCE API] GET request received');

  // 1. Authenticate user via Supabase SSR client
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.warn('[RESEARCH INTELLIGENCE API] Auth required');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to access Research Intelligence.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }
    user = authUser;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify authentication session.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // 2. Build deterministic research intelligence (strictly using authenticated user.id)
  try {
    const intelligence = await buildResearchIntelligence({
      supabase,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: intelligence,
    });
  } catch (err: any) {
    console.error('[RESEARCH INTELLIGENCE API] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while compiling Research Intelligence.',
        code: 'INTELLIGENCE_FAILED',
      },
      { status: 500 }
    );
  }
}
