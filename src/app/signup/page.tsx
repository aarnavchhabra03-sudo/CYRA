'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  Loader2, 
  Phone
} from 'lucide-react';
import CyraLogo from '@/components/cyra-logo';
import { createClient } from '@/lib/supabase/client';

type AuthMethod = 'google' | 'apple' | 'email' | null;

export default function SignupPage() {
  const router = useRouter();
  const [activeAuthMethod, setActiveAuthMethod] = useState<AuthMethod>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getCallbackUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/callback`;
    }
    return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAuthMethod) return;

    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setActiveAuthMethod('email');

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message || 'Failed to create account.');
        setActiveAuthMethod(null);
        return;
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          xp: 0,
          current_streak: 0,
          longest_streak: 0,
        });
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during signup');
      setActiveAuthMethod(null);
    }
  };

  const handleGoogleSignup = async () => {
    if (activeAuthMethod) return;
    setError(null);
    setActiveAuthMethod('google');

    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getCallbackUrl(),
        },
      });

      if (oauthErr) {
        setError('Google sign-in is not configured on this Supabase project. Please use Email registration.');
        setActiveAuthMethod(null);
      }
    } catch (err) {
      setError('Failed to initiate Google authentication. Please try again.');
      setActiveAuthMethod(null);
    }
  };

  const handleAppleSignup = async () => {
    if (activeAuthMethod) return;
    setError(null);
    setActiveAuthMethod('apple');

    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getCallbackUrl(),
        },
      });

      if (oauthErr) {
        setError("Apple sign-in is not configured yet. Please use Google, phone, or email.");
        setActiveAuthMethod(null);
      }
    } catch (err) {
      setError("Apple sign-in is not configured yet. Please use Google, phone, or email.");
      setActiveAuthMethod(null);
    }
  };

  const isAnyLoading = activeAuthMethod !== null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[var(--cyra-bg,#070B12)] text-[var(--cyra-text,#F4F7FB)] font-sans">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 right-1/2 translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[250px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6 relative z-10 animate-os-fade">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-3">
            <CyraLogo size="xl" priority />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--cyra-text,#F4F7FB)]">
            Join <span className="text-[var(--cyra-cyan,#22C7E8)]">CYRA AI</span>
          </h1>
          <p className="text-xs text-[var(--cyra-text-muted,#71839A)] font-medium">
            Create an account to start your personalized learning workspace
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-[var(--cyra-panel,#0D1420)] p-6 sm:p-8 rounded-2xl border border-[var(--cyra-border,#24344A)] shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400 animate-os-fade">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Social Auth Options */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isAnyLoading}
              className="w-full h-11 px-4 rounded-xl bg-[var(--cyra-card,#111B29)] hover:bg-[var(--cyra-card-soft,#162235)] border border-[var(--cyra-border,#24344A)] text-xs font-semibold text-[var(--cyra-text,#F4F7FB)] flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
            >
              {activeAuthMethod === 'google' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--cyra-cyan,#22C7E8)]" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign up with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAppleSignup}
              disabled={isAnyLoading}
              className="w-full h-11 px-4 rounded-xl bg-[var(--cyra-card,#111B29)] hover:bg-[var(--cyra-card-soft,#162235)] border border-[var(--cyra-border,#24344A)] text-xs font-semibold text-[var(--cyra-text,#F4F7FB)] flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
            >
              {activeAuthMethod === 'apple' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--cyra-cyan,#22C7E8)]" />
                  <span>Connecting to Apple...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current flex-shrink-0 text-[var(--cyra-text,#F4F7FB)]" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.84.13-9.66-1.95-14.47-6.23-3.23-2.76-7.16-7.46-11.78-14.1-6.19-8.91-11.04-18.78-14.54-29.62-3.5-10.84-5.26-21.36-5.26-31.56 0-14.78 3.73-27.12 11.19-37.03 7.46-9.91 16.92-14.97 28.38-15.17 4.97 0 10.3 1.25 15.99 3.75 5.69 2.5 9.77 3.75 12.24 3.75 2.12 0 6.13-1.25 12.03-3.75 5.9-2.5 10.96-3.7 15.18-3.6 8.35.45 15.54 3.33 21.57 8.65 6.03 5.32 10.15 12.06 12.36 20.22-10.95 6.6-16.33 15.75-16.14 27.46.19 9.17 3.59 16.89 10.2 23.16 6.61 6.27 14.67 9.87 24.18 10.8-2.2 6.43-5.06 13.06-8.58 19.89zM119.22 31.78c0-7.06 2.57-13.78 7.71-20.16 5.14-6.38 11.66-10.45 19.56-12.22.38.86.58 1.83.58 2.91 0 7.07-2.6 13.82-7.8 20.25-5.2 6.43-11.77 10.49-19.71 12.18-.08-.94-.34-1.93-.34-2.96z" />
                  </svg>
                  <span>Sign up with Apple</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[var(--cyra-border,#24344A)] w-full" />
            <span className="bg-[var(--cyra-panel,#0D1420)] px-3 text-[10px] font-mono text-[var(--cyra-text-muted,#71839A)] uppercase tracking-wider absolute">
              OR
            </span>
          </div>

          <form onSubmit={handleSignup} className="space-y-4 font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--cyra-text-muted,#71839A)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarna Chhabra"
                  required
                  disabled={isAnyLoading}
                  className="w-full bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--cyra-text,#F4F7FB)] placeholder-[var(--cyra-text-muted,#71839A)] focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--cyra-text-muted,#71839A)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isAnyLoading}
                  className="w-full bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--cyra-text,#F4F7FB)] placeholder-[var(--cyra-text-muted,#71839A)] focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--cyra-text-muted,#71839A)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  disabled={isAnyLoading}
                  className="w-full bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--cyra-text,#F4F7FB)] placeholder-[var(--cyra-text-muted,#71839A)] focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--cyra-text-muted,#71839A)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  disabled={isAnyLoading}
                  className="w-full bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--cyra-text,#F4F7FB)] placeholder-[var(--cyra-text-muted,#71839A)] focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnyLoading}
              className="os-button-primary w-full h-11 mt-2 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {activeAuthMethod === 'email' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create CYRA Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 text-center border-t border-[var(--cyra-border,#24344A)] font-mono text-xs">
            <p className="text-[var(--cyra-text-muted,#71839A)]">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--cyra-cyan,#22C7E8)] font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
