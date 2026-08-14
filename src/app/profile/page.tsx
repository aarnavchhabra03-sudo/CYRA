'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, ShieldCheck, Mail, Flame, Zap, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setAuthUser(user);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            setProfile(data);
          } else {
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner',
              xp: 0,
              current_streak: 1,
              longest_streak: 1,
            });
          }
        }
      } catch (err) {
        console.error('Error loading profile page data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  const userName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Learner';
  const userEmail = authUser?.email || 'learner@cyra.ai';
  const userXp = profile?.xp ?? 0;
  const userStreak = profile?.current_streak ?? 1;
  const level = Math.floor(userXp / 300) + 1;
  const levelTitle = level >= 5 ? 'Kernel Architect' : level >= 3 ? 'Systems Specialist' : 'Learner';
  const xpNextLevel = level * 300;
  const xpPct = Math.min(100, Math.max(0, (userXp / xpNextLevel) * 100));

  if (loading) {
    return (
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2.5 text-[var(--text-muted)] mb-1">
            <User className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">User Credentials</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Your Profile</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Review credentials, learning levels, and sync statuses.</p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-[var(--border)] animate-pulse space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] mx-auto md:mx-0" />
          <div className="h-5 bg-[var(--surface-2)] rounded w-36 mx-auto md:mx-0" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-48 mx-auto md:mx-0" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2.5 text-[var(--text-muted)] mb-1">
            <User className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">User Credentials</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Your Profile</h2>
        </div>

        <div className="p-8 rounded-2xl glass-panel border border-[var(--border)] text-center space-y-4">
          <User className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">Authentication Required</h3>
          <p className="text-xs text-[var(--text-secondary)]">Please sign in to view your learning profile, XP stats, and streak history.</p>
          <Link href="/login" className="btn-primary text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            <span>Sign In to CYRA</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <div className="flex items-center gap-2.5 text-[var(--text-muted)] mb-1">
          <User className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">User Credentials</span>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Your Profile</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Review credentials, learning levels, and sync statuses.</p>
      </div>

      <div className="p-6 rounded-2xl glass-panel border border-[var(--border)] flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#149FC4] to-[#5B6FF5] flex items-center justify-center text-white text-xl font-bold uppercase flex-shrink-0 shadow-md">
          {userName[0]}
        </div>
        <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
            <h3 className="text-lg font-bold text-[var(--text-primary)] leading-none truncate">{userName}</h3>
            <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#EAE7FF] text-[#6259B4] border border-[#D9D5FB] self-center md:self-auto">
              Lv {level} • {levelTitle}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 justify-center md:justify-start">
            <span className="text-[9px] font-mono bg-[#F0F5FA] text-[#60758A] px-2.5 py-1 rounded-lg border border-[#D9E2EC] flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-[#149FC4]" /> {userEmail}
            </span>
            <span className="text-[9px] font-mono bg-[#FFF3E8] text-[#B56C32] px-2.5 py-1 rounded-lg border border-[#FCD8B8] flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-[#C4871B]" /> {userStreak}d Streak
            </span>
            <span className="text-[9px] font-mono bg-[#DCEEFF] text-[#286B91] px-2.5 py-1 rounded-lg border border-[#C5DFF2] flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#149FC4]" /> {userXp} XP
            </span>
            <span className="text-[9px] font-mono bg-[#DDF6EC] text-[#218A69] px-2.5 py-1 rounded-lg border border-[#BDEBD9] flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-[#218A69]" /> Sync Active
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1 font-mono">
              <span>Level Progress ({userXp} / {xpNextLevel} XP)</span>
              <span>{Math.round(xpPct)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#D9E2EC]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--cyan))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
