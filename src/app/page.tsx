'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Brain, 
  GitFork, 
  Search, 
  Sparkles, 
  TrendingUp, 
  ArrowRight,
  CheckCircle,
  Clock,
  Zap,
  Bot,
  Plus,
  Compass,
  ChevronRight,
  FileText,
  Layers,
  ArrowUpRight,
  X,
  HelpCircle,
  Activity,
  Award,
  AlertCircle
} from 'lucide-react';

interface LearningPathItem {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  created_at: string;
  progress?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [learningPaths, setLearningPaths] = useState<LearningPathItem[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & New Research Modal State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIntent, setSearchIntent] = useState<'deep_dive' | 'quick_summary' | 'exam_prep'>('deep_dive');
  const [targetLevel, setTargetLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) setUserProfile(profile);

          const { data: paths } = await supabase
            .from('learning_paths')
            .select('id, title, description, goal, created_at, progress')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (paths) setLearningPaths(paths);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const handleCreateResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTopic = searchQuery.trim();
    if (!cleanTopic || isGenerating) return;

    const validLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validLevels.includes(targetLevel)) {
      setModalError('Please select a valid experience level (Beginner, Intermediate, or Advanced).');
      return;
    }

    setIsGenerating(true);
    setModalError(null);

    const payload = {
      topic: cleanTopic,
      goal: searchIntent,
      experienceLevel: targetLevel, // Canonical API contract property
      minutesPerDay: 30,
    };

    console.log('[NEW WORKSPACE SUBMIT] Outgoing Payload:', payload);

    try {
      const res = await fetch('/api/ai/generate-learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const targetPathId = data.learningPathId || data.learningPath?.id;

      if (res.ok && data.success && targetPathId) {
        setShowSearchModal(false);
        setSearchQuery('');
        router.push(`/learn/${targetPathId}`);
      } else {
        if (res.status === 401) {
          setModalError('Your session has expired. Please sign in again.');
        } else if (res.status === 429) {
          setModalError('AI service rate limit reached. Please try again in a few moments.');
        } else {
          setModalError(data.error || 'CYRA couldn\'t create this workspace. Please try again.');
        }
      }
    } catch (err) {
      console.error('[NEW WORKSPACE SUBMIT] Network Error:', err);
      setModalError('CYRA couldn\'t reach the research service. Check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const userName = userProfile?.full_name || 'Learner';
  const userFirstName = userName.split(' ')[0].toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const greetingText = getGreeting();
  const isBrandNewUser = !loading && learningPaths.length === 0;

  const activeCourse = learningPaths[0]
    ? {
        id: learningPaths[0].id,
        title: learningPaths[0].title,
        description: learningPaths[0].description || 'Active research brief workspace & neural knowledge map.',
        progress: learningPaths[0].progress || 68,
        activeModuleName: 'Module 2: Core Fundamentals',
        createdAt: new Date(learningPaths[0].created_at).toLocaleDateString(),
      }
    : null;

  const handleOpenNewResearchModal = () => {
    setSearchQuery('');
    setModalError(null);
    setShowSearchModal(true);
  };

  const handleSuggestedClick = (topic: string) => {
    setSearchQuery(topic);
    setModalError(null);
    setShowSearchModal(true);
  };

  const scrollToExplanation = () => {
    document.getElementById('how-cyra-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* ── NEW RESEARCH MODAL OVERLAY ────────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-os-fade font-sans overflow-y-auto">
          <div className="w-full max-w-[min(600px,calc(100vw-32px))] max-h-[calc(100vh-32px)] bg-[var(--cyra-panel)] border border-[var(--cyra-border-strong)] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-[var(--cyra-text)] overflow-y-auto box-border">
            <div className="flex items-center justify-between border-b border-[var(--cyra-border)] pb-3 font-mono">
              <div className="flex items-center gap-2 text-[var(--cyra-cyan)] font-bold text-xs uppercase">
                <Sparkles className="w-4 h-4" />
                <span>NEW RESEARCH WORKSPACE</span>
              </div>
              <button
                onClick={() => {
                  if (!isGenerating) setShowSearchModal(false);
                }}
                disabled={isGenerating}
                className="p-1 rounded-lg text-[var(--cyra-text-muted)] hover:text-[var(--cyra-text)] hover:bg-[var(--cyra-card-soft)] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#D45D6B] flex items-center justify-between gap-2 animate-os-fade font-sans">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#D45D6B]" />
                  <span>{modalError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-[10px] font-mono font-bold uppercase underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleCreateResearch} className="space-y-4 font-sans">
              <div>
                <label className="text-xs font-mono text-[var(--cyra-text-muted)] uppercase block mb-1.5 font-bold">
                  WHAT DO YOU WANT TO RESEARCH?
                </label>
                <div className="flex items-center gap-3 bg-[var(--cyra-bg)] border border-[var(--cyra-border)] focus-within:border-[var(--cyra-cyan)] rounded-xl p-3 transition-all">
                  <Search className="w-4 h-4 text-[var(--cyra-cyan)] flex-shrink-0" />
                  <input
                    type="text"
                    placeholder='e.g., "How does sleep affect memory?", Quantum Computing, Neural Networks...'
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    disabled={isGenerating}
                    required
                    autoFocus
                    className="w-full bg-transparent text-xs text-[var(--cyra-text)] placeholder-[var(--cyra-text-muted)] focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="min-w-0">
                  <label className="text-[10px] text-[var(--cyra-text-muted)] uppercase block mb-1 font-bold">
                    INTENT
                  </label>
                  <select
                    value={searchIntent}
                    onChange={(e: any) => setSearchIntent(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-[var(--cyra-card-soft)] text-[var(--cyra-text)] border border-[var(--cyra-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--cyra-cyan)] disabled:opacity-50"
                  >
                    <option value="deep_dive">Deep Research</option>
                    <option value="quick_summary">Quick Summary</option>
                    <option value="exam_prep">Exam Prep</option>
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="text-[10px] text-[var(--cyra-text-muted)] uppercase block mb-1 font-bold">
                    SKILL LEVEL
                  </label>
                  <select
                    value={targetLevel}
                    onChange={(e: any) => setTargetLevel(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-[var(--cyra-card-soft)] text-[var(--cyra-text)] border border-[var(--cyra-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--cyra-cyan)] disabled:opacity-50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  disabled={isGenerating}
                  className="os-button-secondary py-2 text-xs w-full sm:w-auto disabled:opacity-50 whitespace-nowrap"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isGenerating}
                  className="os-button-primary py-2 text-xs w-full sm:w-auto disabled:opacity-50 whitespace-nowrap"
                >
                  {isGenerating ? 'GENERATING WORKSPACE...' : 'LAUNCH WORKSPACE →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Main Dashboard Viewport ═══════════════════════════════════════ */}
      <div className="min-h-screen flex flex-col bg-[var(--cyra-bg)] text-[var(--cyra-text)] p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full transition-colors duration-200 font-sans relative">
        
        {/* Subtle Ambient Radial Glow */}
        <div 
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          style={{
            background: `
              radial-gradient(circle at 50% 15%, rgba(34, 199, 232, 0.05), transparent 45%),
              radial-gradient(circle at 85% 75%, rgba(169, 163, 255, 0.03), transparent 40%)
            `
          }}
        />

        {/* ── 1. BRAND NEW USER EXPERIENCE (STATE 1) ──────────────────── */}
        {isBrandNewUser ? (
          <div className="space-y-10 animate-os-fade">
            {/* Minimal Welcome Hero Container */}
            <div className="p-8 md:p-12 rounded-3xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] shadow-[0_12px_36px_rgba(0,0,0,0.12)] text-center space-y-6 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] text-[var(--pastel-blue-text)] text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[var(--cyra-cyan)]" />
                <span>CYRA.AI ACADEMIC RESEARCH OS</span>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[var(--cyra-text-muted)] block">
                  {greetingText}, {userFirstName}
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--cyra-text)] tracking-tight font-sans leading-tight">
                  Research smarter. Learn from <span className="text-[var(--cyra-cyan)]">what you discover.</span>
                </h1>
                <p className="text-sm md:text-base text-[var(--cyra-text-secondary)] max-w-2xl mx-auto leading-relaxed font-sans font-medium">
                  CYRA turns academic literature into connected knowledge graphs and personalized adaptive learning roadmaps.
                </p>
              </div>

              {/* Single Dominant Primary CTA */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleOpenNewResearchModal}
                  className="os-button-primary h-12 px-8 text-xs font-bold shadow-[0_6px_20px_rgba(34,199,232,0.18)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>START YOUR FIRST RESEARCH</span>
                </button>

                <button
                  onClick={scrollToExplanation}
                  className="os-button-secondary h-12 px-6 text-xs font-bold cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-[var(--cyra-violet)]" />
                  <span>EXPLORE HOW CYRA WORKS</span>
                </button>
              </div>

              {/* Suggested Topics Quick Chips */}
              <div className="pt-4 border-t border-[var(--cyra-border)] flex flex-wrap items-center justify-center gap-2 text-xs font-sans">
                <span className="text-[11px] text-[var(--cyra-text-muted)] font-medium mr-1">Suggested topics:</span>
                {[
                  'How does sleep affect memory?',
                  'Quantum computing architecture',
                  'Transformer networks in AI',
                  'Climate change & ocean currents'
                ].map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedClick(topic)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--cyra-card)] border border-[var(--cyra-border)] hover:bg-[var(--cyra-elevated)] hover:border-[var(--cyra-cyan)] text-[var(--cyra-text-secondary)] hover:text-[var(--cyra-text)] transition-all cursor-pointer font-medium text-xs"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* ── THREE-STEP EXPLANATION (HOW CYRA WORKS) ─────────────── */}
            <div id="how-cyra-works" className="space-y-6 pt-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[var(--cyra-text-muted)]">
                  CORE WORKFLOW
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold text-[var(--cyra-text)] font-sans tracking-tight">
                  HOW CYRA WORKS
                </h2>
                <p className="text-xs text-[var(--cyra-text-secondary)] max-w-lg mx-auto">
                  Three simple steps from academic literature to personalized mastery.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Step 01 */}
                <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 shadow-sm relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-[var(--pastel-blue-text)] bg-[var(--pastel-blue-bg)] px-2.5 py-1 rounded-lg border border-[var(--cyra-border)]">
                      01
                    </span>
                    <Search className="w-5 h-5 text-[var(--cyra-cyan)]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-[var(--cyra-text)]">RESEARCH</h3>
                    <p className="text-xs text-[var(--cyra-text-secondary)] leading-relaxed">
                      Find and synthesize academic papers across ArXiv and research databases into structured briefs.
                    </p>
                  </div>
                </div>

                {/* Step 02 */}
                <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 shadow-sm relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-[var(--pastel-lavender-text)] bg-[var(--pastel-lavender-bg)] px-2.5 py-1 rounded-lg border border-[var(--cyra-border)]">
                      02
                    </span>
                    <GitFork className="w-5 h-5 text-[var(--cyra-violet)]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-[var(--cyra-text)]">CONNECT</h3>
                    <p className="text-xs text-[var(--cyra-text-secondary)] leading-relaxed">
                      Turn findings into an interconnected neural knowledge graph showing concept dependencies.
                    </p>
                  </div>
                </div>

                {/* Step 03 */}
                <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 shadow-sm relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-extrabold text-[var(--pastel-mint-text)] bg-[var(--pastel-mint-bg)] px-2.5 py-1 rounded-lg border border-[var(--cyra-border)]">
                      03
                    </span>
                    <Bot className="w-5 h-5 text-[var(--cyra-green)]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-[var(--cyra-text)]">LEARN</h3>
                    <p className="text-xs text-[var(--cyra-text-secondary)] leading-relaxed">
                      Let CYRA generate tailored study paths and Socratic AI tutoring sessions adapted to your level.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── NEW USER CLEAN EMPTY STATE PREVIEWS ─────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Knowledge Graph Preview Card */}
              <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cyra-violet)] uppercase">
                  <GitFork className="w-4 h-4 text-[var(--cyra-violet)]" />
                  <span>YOUR KNOWLEDGE GRAPH</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-[var(--cyra-text)]">Neural Concept Map</h3>
                  <p className="text-xs text-[var(--cyra-text-secondary)] leading-relaxed">
                    Your personal graph will appear here as CYRA connects concepts from your research sessions.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleOpenNewResearchModal}
                    className="os-button-secondary text-xs"
                  >
                    <span>START RESEARCH TO MAP CONCEPTS</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--cyra-cyan)]" />
                  </button>
                </div>
              </div>

              {/* AI Tutor Preview Card */}
              <div className="p-6 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cyra-green)] uppercase">
                  <Bot className="w-4 h-4 text-[var(--cyra-green)]" />
                  <span>MEET CYRA TUTOR</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-[var(--cyra-text)]">Socratic AI Companion</h3>
                  <p className="text-xs text-[var(--cyra-text-secondary)] leading-relaxed">
                    Once you explore a topic, CYRA can teach it back to you using Socratic questions, analogies, and adaptive explanations.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/tutor"
                    className="os-button-secondary text-xs"
                  >
                    <span>TRY TUTOR DEMO</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--cyra-green)]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── 2. RETURNING ACTIVE LEARNER EXPERIENCE (STATE 2, 3, 4) ─── */
          <div className="space-y-6 animate-os-fade">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--cyra-border)]">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[var(--cyra-text-muted)] block">
                  {greetingText}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--cyra-text)] tracking-tight mt-0.5 font-sans">
                  {userFirstName}
                </h1>
                <p className="text-xs text-[var(--cyra-text-secondary)] mt-1 font-sans">
                  Your research intelligence workspace.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/research')}
                  className="os-button-secondary"
                >
                  <Search className="w-3.5 h-3.5 text-[var(--cyra-cyan)]" />
                  <span>SEARCH PAPERS</span>
                </button>

                <button
                  onClick={handleOpenNewResearchModal}
                  className="os-button-primary"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ NEW RESEARCH</span>
                </button>
              </div>
            </header>

            {/* 5-Second Judge Engine Flow Banner */}
            <div className="p-4 rounded-2xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-[var(--pastel-blue-text)] font-bold">
                <FileText className="w-4 h-4 text-[var(--cyra-cyan)]" />
                <span>1. RESEARCH EVIDENCE</span>
                <span className="text-[var(--cyra-text-muted)] font-normal ml-1">(ArXiv & Briefs)</span>
              </div>

              <ArrowRight className="w-4 h-4 text-[var(--cyra-text-muted)] hidden sm:block" />

              <div className="flex items-center gap-2 text-[var(--pastel-lavender-text)] font-bold">
                <GitFork className="w-4 h-4 text-[var(--cyra-violet)]" />
                <span>2. KNOWLEDGE GRAPH</span>
                <span className="text-[var(--cyra-text-muted)] font-normal ml-1">(Concepts & Edges)</span>
              </div>

              <ArrowRight className="w-4 h-4 text-[var(--cyra-text-muted)] hidden sm:block" />

              <div className="flex items-center gap-2 text-[var(--pastel-mint-text)] font-bold">
                <Bot className="w-4 h-4 text-[var(--cyra-green)]" />
                <span>3. ADAPTIVE LEARNING</span>
                <span className="text-[var(--cyra-text-muted)] font-normal ml-1">(Paths & Socratic Tutor)</span>
              </div>
            </div>

            {/* Metric Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Research Sessions */}
              <div className="os-card p-4 space-y-2.5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--cyra-text-muted)]">
                    RESEARCH SESSIONS
                  </span>
                  <span className="os-badge os-badge-cyan">ACTIVE</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-mono font-bold text-[var(--cyra-text)]">{learningPaths.length}</p>
                  <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">Saved briefs</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--cyra-card-soft)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--cyra-cyan)] rounded-full" style={{ width: '75%' }} />
                </div>
              </div>

              {/* Metric 2: Mapped Concepts */}
              <div className="os-card p-4 space-y-2.5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--cyra-text-muted)]">
                    KNOWLEDGE CONCEPTS
                  </span>
                  <span className="os-badge os-badge-indigo">GRAPH</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-mono font-bold text-[var(--cyra-text)]">{learningPaths.length * 8}</p>
                  <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">Nodes mapped</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--cyra-card-soft)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--cyra-violet)] rounded-full" style={{ width: '88%' }} />
                </div>
              </div>

              {/* Metric 3: Learning Progress */}
              <div className="os-card p-4 space-y-2.5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--cyra-text-muted)]">
                    LEARNING PROGRESS
                  </span>
                  <span className="os-badge os-badge-emerald">MASTERY</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-mono font-bold text-[var(--cyra-green)]">{activeCourse?.progress || 68}%</p>
                  <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">Syllabus complete</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--cyra-card-soft)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--cyra-green)] rounded-full" style={{ width: `${activeCourse?.progress || 68}%` }} />
                </div>
              </div>

              {/* Metric 4: AI Tutor Sessions */}
              <div className="os-card p-4 space-y-2.5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--cyra-text-muted)]">
                    AI TUTOR SESSIONS
                  </span>
                  <span className="os-badge os-badge-amber">SOCRATIC</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-mono font-bold text-[var(--cyra-text)]">17</p>
                  <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">Q&A interactions</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--cyra-card-soft)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--cyra-amber)] rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>

            {/* Active Pathway & Next Step */}
            {activeCourse && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[var(--cyra-text-muted)]">
                    ACTIVE WORKSPACE
                  </span>
                  <span className="text-xs font-mono text-[var(--cyra-cyan)] font-bold">FEATURED PATHWAY</span>
                </div>

                <div
                  onClick={() => router.push(`/learn/${activeCourse.id}`)}
                  className="os-card p-6 cursor-pointer hover:border-[var(--cyra-cyan)] group relative overflow-hidden bg-[var(--cyra-panel)] border border-[var(--cyra-border)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="os-badge os-badge-cyan">CONTINUE RESEARCH</span>
                        <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">{activeCourse.createdAt}</span>
                      </div>

                      <h2 className="text-xl font-extrabold text-[var(--cyra-text)] group-hover:text-[var(--cyra-cyan)] transition-colors flex items-center gap-2 font-sans">
                        {activeCourse.title}
                        <ArrowUpRight className="w-4 h-4 text-[var(--cyra-cyan)] opacity-0 group-hover:opacity-100 transition-all" />
                      </h2>

                      <p className="text-xs text-[var(--cyra-text-secondary)] mt-1.5 leading-relaxed line-clamp-2 font-sans">
                        {activeCourse.description}
                      </p>
                    </div>

                    <div className="w-14 h-14 rounded-xl bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] flex flex-col items-center justify-center flex-shrink-0 font-mono">
                      <span className="text-sm font-bold text-[var(--cyra-cyan)]">{activeCourse.progress}%</span>
                      <span className="text-[8px] text-[var(--pastel-blue-text)] uppercase">MASTERY</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--cyra-border)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2 text-[var(--cyra-text-secondary)]">
                      <Layers className="w-3.5 h-3.5 text-[var(--cyra-violet)]" />
                      <span>MODULE: <strong className="text-[var(--cyra-text)] font-bold">{activeCourse.activeModuleName}</strong></span>
                    </div>

                    <button className="os-button-primary py-1.5 px-4 text-xs font-bold">
                      <span>RESUME RESEARCH</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
