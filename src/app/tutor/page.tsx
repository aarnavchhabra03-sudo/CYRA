'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Bot, Brain, Sparkles, Flame, User, ArrowRight, Sun, Moon } from 'lucide-react';
import TutorTab from '@/components/tutor-tab';
import { useTheme } from '@/context/ThemeContext';

function TutorHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="px-5 py-3 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] flex flex-wrap items-center justify-between gap-4 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] flex items-center justify-center text-[var(--cyra-cyan)] font-mono font-bold text-sm shadow-xs">
          C
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-[var(--cyra-text)] tracking-tight font-sans">CYRA.AI</span>
            <span className="os-badge os-badge-cyan text-[9px]">ADAPTIVE LEARNING OS</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--cyra-green)] mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyra-green)] animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>
        </div>
      </div>

      {/* Global Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 font-sans font-medium text-xs text-[var(--cyra-text-secondary)]">
        <Link href="/research" className="hover:text-[var(--cyra-cyan)] transition-colors">Research</Link>
        <Link href="/courses" className="hover:text-[var(--cyra-cyan)] transition-colors">Learn</Link>
        <Link href="/research/intelligence" className="hover:text-[var(--cyra-cyan)] transition-colors">Knowledge</Link>
        <Link href="/progress" className="hover:text-[var(--cyra-cyan)] transition-colors">Progress</Link>
      </nav>

      {/* Right Stats & Profile Rail */}
      <div className="flex items-center gap-3 font-mono text-xs">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme mode"
          className="p-1.5 rounded-lg bg-[var(--cyra-card)] border border-[var(--cyra-border)] text-[var(--cyra-text-secondary)] hover:text-[var(--cyra-text)] hover:border-[var(--cyra-cyan)] transition-all cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>

        <div className="os-badge os-badge-indigo hidden sm:inline-flex">
          <Sparkles className="w-3 h-3 text-[var(--cyra-violet)]" />
          <span>1,450 XP</span>
        </div>

        <div className="os-badge os-badge-amber hidden sm:inline-flex">
          <Flame className="w-3 h-3 text-[var(--cyra-amber)]" />
          <span>5d STREAK</span>
        </div>

        <div className="w-7 h-7 rounded-lg bg-[var(--cyra-card)] border border-[var(--cyra-border)] flex items-center justify-center text-[var(--cyra-text)]">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    </header>
  );
}

export default function StandaloneTutorPage() {
  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5 bg-[var(--cyra-bg)] text-[var(--cyra-text)] min-h-screen font-sans transition-colors duration-200">
      <TutorHeader />

      {/* ── MAIN WORKSPACE ───────────────────────────────────────────── */}
      <Suspense fallback={
        <div className="h-[720px] rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] flex items-center justify-center font-mono text-xs text-[var(--cyra-text-muted)] animate-pulse">
          Initializing CYRA Adaptive Learning OS...
        </div>
      }>
        <TutorTab />
      </Suspense>
    </div>
  );
}
