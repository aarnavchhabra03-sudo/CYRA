'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  Phone, 
  X, 
  CheckCircle2, 
  KeyRound
} from 'lucide-react';
import CyraLogo from '@/components/cyra-logo';
import { createClient } from '@/lib/supabase/client';

type AuthMethod = 'google' | 'apple' | 'phone' | 'email' | null;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Discrete Auth Method State (Prevents UI loading state bleeding between buttons)
  const [activeAuthMethod, setActiveAuthMethod] = useState<AuthMethod>(null);

  // Email / Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Phone Auth State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const callbackErr = searchParams.get('error');
    if (callbackErr === 'auth_callback_failed') {
      setError('Authentication was cancelled or could not be completed. Please try again.');
    }
  }, [searchParams]);

  // Timer Countdown for OTP Resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const getCallbackUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/callback`;
    }
    return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`;
  };

  // Standard Email/Password Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAuthMethod) return;

    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setActiveAuthMethod('email');

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password.');
        } else {
          setError(authError.message || 'We couldn\'t sign you in right now. Please try again.');
        }
        setActiveAuthMethod(null);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError('Connection problem. Please check your internet connection and try again.');
      setActiveAuthMethod(null);
    }
  };

  // Google OAuth Sign In
  const handleGoogleLogin = async () => {
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
        console.error('[GOOGLE AUTH ERROR]', oauthErr);
        setError('Google sign-in is not configured on this Supabase project. Please use Email login.');
        setActiveAuthMethod(null);
      }
    } catch (err) {
      setError('Google sign-in couldn\'t be completed. Please try again.');
      setActiveAuthMethod(null);
    }
  };

  // Apple OAuth Sign In
  const handleAppleLogin = async () => {
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
        console.error('[APPLE AUTH ERROR]', oauthErr);
        setError("Apple sign-in is not configured yet. Please use Google, phone, or email.");
        setActiveAuthMethod(null);
      }
    } catch (err) {
      setError("Apple sign-in is not configured yet. Please use Google, phone, or email.");
      setActiveAuthMethod(null);
    }
  };

  // Send Phone OTP Code
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      setPhoneError('Please enter a valid phone number (7-15 digits).');
      return;
    }

    const fullPhone = `${countryCode}${cleanPhone}`;
    setActiveAuthMethod('phone');

    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (otpErr) {
        if (otpErr.message.includes('Unsupported country') || otpErr.message.includes('not enabled')) {
          setPhoneError('Phone sign-in is not enabled on this Supabase project. Please use Email or Google.');
        } else {
          setPhoneError(otpErr.message || 'We couldn\'t send the verification code. Please check your number.');
        }
        setActiveAuthMethod(null);
        return;
      }

      setOtpStep('otp');
      setOtpCountdown(30);
      setActiveAuthMethod(null);
    } catch (err) {
      setPhoneError('Phone sign-in is not available yet. Please use Google or email.');
      setActiveAuthMethod(null);
    }
  };

  // Verify Phone OTP Code
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const token = otpDigits.join('');
    if (token.length !== 6) {
      setPhoneError('Please enter the full 6-digit verification code.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = `${countryCode}${cleanPhone}`;
    setActiveAuthMethod('phone');

    try {
      const supabase = createClient();
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token,
        type: 'sms',
      });

      if (verifyErr || !data.session) {
        setPhoneError('Invalid or expired verification code. Please check and try again.');
        setActiveAuthMethod(null);
        return;
      }

      // Ensure profile exists for phone user using safe fallbacks
      if (data.user) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: `Learner ${fullPhone.slice(-4)}`,
            updated_at: new Date().toISOString(),
          });
        }
      }

      setShowPhoneModal(false);
      setActiveAuthMethod(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      setPhoneError('Failed to verify code. Please try again.');
      setActiveAuthMethod(null);
    }
  };

  // OTP Box Handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedData.length, 5);
      otpRefs.current[nextIndex]?.focus();
    }
  };

  // Handle Forgot Password
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetLoading(true);

    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/settings`,
      });

      if (resetErr) {
        setResetError(resetErr.message || 'Failed to send password reset email.');
        setResetLoading(false);
        return;
      }

      setResetSuccess(true);
      setResetLoading(false);
    } catch (err) {
      setResetError('Failed to request password reset. Please try again.');
      setResetLoading(false);
    }
  };

  const isAnyLoading = activeAuthMethod !== null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[var(--cyra-bg,#070B12)] text-[var(--cyra-text,#F4F7FB)] font-sans">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[250px] bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[420px] space-y-6 relative z-10 animate-os-fade">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-3">
            <CyraLogo size="xl" priority />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--cyra-text,#F4F7FB)]">
            Welcome back to <span className="text-[var(--cyra-cyan,#22C7E8)]">CYRA AI</span>
          </h1>
          <p className="text-xs text-[var(--cyra-text-muted,#71839A)] font-medium">
            Sign in to access your personalized learning workspace
          </p>
        </div>

        {/* Login Container Card */}
        <div className="bg-[var(--cyra-panel,#0D1420)] p-6 sm:p-8 rounded-2xl border border-[var(--cyra-border,#24344A)] shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400 animate-os-fade">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Social Auth Suite */}
          <div className="space-y-2.5">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
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
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Apple OAuth Button */}
            <button
              type="button"
              onClick={handleAppleLogin}
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
                  <span>Continue with Apple</span>
                </>
              )}
            </button>

            {/* Phone OTP Button */}
            <button
              type="button"
              onClick={() => {
                setPhoneError(null);
                setShowPhoneModal(true);
              }}
              disabled={isAnyLoading}
              className="w-full h-11 px-4 rounded-xl bg-[var(--cyra-card,#111B29)] hover:bg-[var(--cyra-card-soft,#162235)] border border-[var(--cyra-border,#24344A)] text-xs font-semibold text-[var(--cyra-text,#F4F7FB)] flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
            >
              <Phone className="w-4 h-4 text-[var(--cyra-cyan,#22C7E8)] flex-shrink-0" />
              <span>Continue with Phone</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[var(--cyra-border,#24344A)] w-full" />
            <span className="bg-[var(--cyra-panel,#0D1420)] px-3 text-[10px] font-mono text-[var(--cyra-text-muted,#71839A)] uppercase tracking-wider absolute">
              OR
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4 font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">
                Email Address
              </label>
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetError(null);
                    setResetSuccess(false);
                    setShowForgotPassword(true);
                  }}
                  className="text-[11px] font-medium text-[var(--cyra-cyan,#22C7E8)] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--cyra-text-muted,#71839A)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to CYRA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 text-center border-t border-[var(--cyra-border,#24344A)] font-mono text-xs">
            <p className="text-[var(--cyra-text-muted,#71839A)]">
              Don't have an account?{' '}
              <Link href="/signup" className="text-[var(--cyra-cyan,#22C7E8)] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── PHONE OTP AUTHENTICATION MODAL ────────────────────────────── */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-os-fade">
          <div className="w-full max-w-sm bg-[var(--cyra-panel,#0D1420)] border border-[var(--cyra-border-strong,#24344A)] rounded-2xl p-6 shadow-2xl space-y-4 text-[var(--cyra-text,#F4F7FB)]">
            <div className="flex items-center justify-between border-b border-[var(--cyra-border,#24344A)] pb-3 font-mono">
              <div className="flex items-center gap-2 text-[var(--cyra-cyan,#22C7E8)] font-bold text-xs uppercase">
                <Phone className="w-4 h-4" />
                <span>PHONE AUTHENTICATION</span>
              </div>
              <button
                onClick={() => {
                  if (activeAuthMethod !== 'phone') {
                    setShowPhoneModal(false);
                    setOtpStep('phone');
                  }
                }}
                disabled={activeAuthMethod === 'phone'}
                className="p-1 rounded-lg text-[var(--cyra-text-muted,#71839A)] hover:text-[var(--cyra-text,#F4F7FB)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {phoneError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-400 animate-os-fade">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{phoneError}</span>
              </div>
            )}

            {otpStep === 'phone' ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">
                    Enter your phone number
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={activeAuthMethod === 'phone'}
                      className="bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] text-xs text-[var(--cyra-text,#F4F7FB)] rounded-xl px-2.5 py-2.5 font-mono focus:outline-none focus:border-[var(--cyra-cyan,#22C7E8)]"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+49">+49 (DE)</option>
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      required
                      autoFocus
                      disabled={activeAuthMethod === 'phone'}
                      className="w-full bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--cyra-text,#F4F7FB)] placeholder-[var(--cyra-text-muted,#71839A)] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={activeAuthMethod === 'phone' || !phoneNumber.trim()}
                  className="os-button-primary w-full h-10 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {activeAuthMethod === 'phone' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send verification code</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4 font-sans">
                <div className="space-y-2 text-center">
                  <p className="text-xs text-[var(--cyra-text-secondary,#A9B9CC)]">
                    Enter the 6-digit verification code sent to{' '}
                    <span className="font-mono font-bold text-[var(--cyra-cyan,#22C7E8)]">
                      {countryCode} {phoneNumber}
                    </span>
                  </p>

                  <div className="flex items-center justify-center gap-2 py-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpRefs.current[idx] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        disabled={activeAuthMethod === 'phone'}
                        className="w-10 h-12 text-center bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl text-base font-mono font-bold text-[var(--cyra-text,#F4F7FB)] focus:outline-none transition-all disabled:opacity-50"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={activeAuthMethod === 'phone' || otpDigits.join('').length !== 6}
                  className="os-button-primary w-full h-10 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {activeAuthMethod === 'phone' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--cyra-text-muted,#71839A)] pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpStep('phone')}
                    className="hover:underline cursor-pointer"
                  >
                    Change phone number
                  </button>

                  <button
                    type="button"
                    disabled={otpCountdown > 0 || activeAuthMethod === 'phone'}
                    onClick={handleSendPhoneOtp}
                    className="text-[var(--cyra-cyan,#22C7E8)] font-bold hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── FORGOT PASSWORD MODAL ──────────────────────────────────────── */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-os-fade">
          <div className="w-full max-w-sm bg-[var(--cyra-panel,#0D1420)] border border-[var(--cyra-border-strong,#24344A)] rounded-2xl p-6 shadow-2xl space-y-4 text-[var(--cyra-text,#F4F7FB)]">
            <div className="flex items-center justify-between border-b border-[var(--cyra-border,#24344A)] pb-3 font-mono">
              <div className="flex items-center gap-2 text-[var(--cyra-cyan,#22C7E8)] font-bold text-xs uppercase">
                <KeyRound className="w-4 h-4" />
                <span>RESET PASSWORD</span>
              </div>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="p-1 rounded-lg text-[var(--cyra-text-muted,#71839A)] hover:text-[var(--cyra-text,#F4F7FB)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-400 animate-os-fade">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess ? (
              <div className="space-y-4 text-center py-2 font-sans">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--cyra-text,#F4F7FB)]">Password reset link sent!</h3>
                  <p className="text-xs text-[var(--cyra-text-secondary,#A9B9CC)]">
                    We sent a password recovery link to <span className="font-semibold text-white">{resetEmail}</span>.
                  </p>
                </div>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="os-button-secondary w-full py-2 text-xs font-bold cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordReset} className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--cyra-text-secondary,#A9B9CC)] block">
                    Your email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--cyra-text-muted,#71839A)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoFocus
                      disabled={resetLoading}
                      className="w-full bg-[var(--cyra-bg,#070B12)] border border-[var(--cyra-border,#24344A)] focus:border-[var(--cyra-cyan,#22C7E8)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--cyra-text,#F4F7FB)] placeholder-[var(--cyra-text-muted,#71839A)] focus:outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="os-button-secondary py-2 px-4 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail.trim()}
                    className="os-button-primary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send reset link →</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#070B12] text-white">
          <Loader2 className="w-6 h-6 animate-spin text-[#22C7E8]" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
