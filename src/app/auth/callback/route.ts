import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data?.user) {
        // Ensure profile exists in profiles table
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          const meta = data.user.user_metadata || {};
          const fullName = meta.full_name || meta.name || (data.user.email ? data.user.email.split('@')[0] : 'Learner');

          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: fullName,
            avatar_url: meta.avatar_url || meta.picture || null,
            updated_at: new Date().toISOString(),
          });
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (err) {
      console.error('[AUTH CALLBACK] Exception during OAuth callback exchange:', err);
    }
  }

  // Fallback redirection to login page with error state
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
