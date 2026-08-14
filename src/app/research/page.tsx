'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResearchSearch } from '@/components/research/research-search';
import { ResearchResults } from '@/components/research/research-results';
import { ResearchSource, ProviderStatus, ResearchIntent, ResearchBrief } from '@/lib/research/types';
import { createClient } from '@/lib/supabase/client';
import { 
  FileText, 
  Bookmark, 
  GitFork, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Layers,
  ChevronRight
} from 'lucide-react';

export default function ResearchPage() {
  const router = useRouter();
  const [activeQuery, setActiveQuery] = useState('');
  const [rawResults, setRawResults] = useState<ResearchSource[]>([]);
  const [sourceCounts, setSourceCounts] = useState({ arxiv: 0, academic: 0, web: 0 });
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | undefined>(undefined);
  const [searchIntent, setSearchIntent] = useState<ResearchIntent | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<'all' | 'academic' | 'arxiv' | 'web'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest'>('relevance');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Stage 13.2 Synthesis State
  const [researchBrief, setResearchBrief] = useState<ResearchBrief | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Stage 13.3 Learn State
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [creationProgressStep, setCreationProgressStep] = useState<string | null>(null);
  const [existingPathId, setExistingPathId] = useState<string | null>(null);

  // Quick stats state for 3-card intelligence section
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [totalSavedCount, setTotalSavedCount] = useState<number>(0);

  useEffect(() => {
    async function loadQuickStats() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, count } = await supabase
            .from('research_documents')
            .select('id, title, topic, intent, created_at', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (data) setRecentDocs(data);
          if (count !== null) setTotalSavedCount(count);
        }
      } catch (err) {
        console.error('Error fetching research stats:', err);
      }
    }

    loadQuickStats();
  }, []);

  const handleExecuteSearch = async (query: string) => {
    if (!query || !query.trim()) return;

    setActiveQuery(query.trim());
    setIsLoading(true);
    setErrorMsg(null);
    setHasSearched(true);
    setResearchBrief(null);
    setSynthesisError(null);
    setExistingPathId(null);

    try {
      const res = await fetch('/api/research/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          filter: 'all',
          sortBy: 'relevance',
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Research couldn't reach the source providers. Please try again.");
      }

      const data = json.data;
      setRawResults(data.results || []);
      setSourceCounts(data.sources || { arxiv: 0, academic: 0, web: 0 });
      setProviderStatus(data.providerStatus);
      setSearchIntent(data.intent);
    } catch (err: any) {
      console.error('[RESEARCH PAGE] Search execution error:', err);
      setErrorMsg(err.message || "Research couldn't reach the source providers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSynthesizeResearch = async () => {
    if (!activeQuery || rawResults.length === 0 || isSynthesizing) return;

    setIsSynthesizing(true);
    setSynthesisError(null);

    try {
      const res = await fetch('/api/research/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: activeQuery,
          sources: rawResults.slice(0, 8),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "CYRA couldn't complete the research synthesis.");
      }

      setResearchBrief(json.data);
    } catch (err: any) {
      console.error('[RESEARCH PAGE] Synthesis error:', err);
      setSynthesisError(err.message || "CYRA couldn't complete the research synthesis.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCreateLearningPath = async (brief: ResearchBrief) => {
    if (!brief || isCreatingPath) return;

    setIsCreatingPath(true);
    setCreationProgressStep('Analyzing research findings... Structuring concepts...');
    setExistingPathId(null);

    try {
      setCreationProgressStep('Building lessons and curriculum roadmap...');
      const res = await fetch('/api/research/create-learning-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: activeQuery,
          brief,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create learning path from research brief.');
      }

      if (json.existingPath && json.learningPathId) {
        setExistingPathId(json.learningPathId);
        setIsCreatingPath(false);
        return;
      }

      setCreationProgressStep('Preparing your adaptive path...');
      if (json.learningPathId) {
        router.push(`/learn/${json.learningPathId}`);
      }
    } catch (err: any) {
      console.error('[RESEARCH PAGE] Path creation error:', err);
      setErrorMsg(err.message || 'Failed to create learning path.');
      setIsCreatingPath(false);
    } finally {
      setCreationProgressStep(null);
    }
  };

  const filteredAndSortedResults = React.useMemo(() => {
    let list = [...rawResults];

    if (activeFilter === 'arxiv') {
      list = list.filter((r) => r.sourceType === 'arxiv');
    } else if (activeFilter === 'academic') {
      list = list.filter((r) => r.sourceType === 'academic' || r.sourceType === 'arxiv');
    } else if (activeFilter === 'web') {
      list = list.filter((r) => r.sourceType === 'web');
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      list.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return list;
  }, [rawResults, activeFilter, sortBy]);

  return (
    <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-8 bg-[var(--cyra-bg)] text-[var(--cyra-text)] transition-colors duration-200">
      
      {/* ── RESEARCH HERO & SEARCH BAR ─────────────────────────────── */}
      <React.Suspense fallback={<div className="w-full max-w-[800px] mx-auto h-32 bg-[#FFFFFF] animate-pulse rounded-2xl border border-[#D9E2EC]" />}>
        <ResearchSearch
          onSearch={handleExecuteSearch}
          isLoading={isLoading}
          hasSearched={hasSearched}
        />
      </React.Suspense>

      {/* ── 3 COMPACT RESEARCH INTELLIGENCE CARDS (BEFORE SEARCH) ───── */}
      {!hasSearched && !isLoading && (
        <div className="w-full max-w-6xl mx-auto pt-6 space-y-4 font-sans animate-os-fade">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#60758A]">
              RESEARCH INTELLIGENCE OVERVIEW
            </span>
            <Link href="/research/library" className="text-xs font-mono text-[#149FC4] font-bold hover:underline">
              LIBRARY &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: RECENT RESEARCH */}
            <div className="bg-[#FFFFFF] border border-[#D9E2EC] rounded-2xl p-6 shadow-[0_4px_18px_rgba(40,70,100,0.05)] space-y-4 flex flex-col justify-between hover:border-[#C5D2E0] transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#DCEEFF] text-[#286B91] border border-[#C5DFF2]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#286B91] bg-[#DCEEFF] px-2 py-0.5 rounded-md">
                    ACTIVE BRIEF
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#172033] tracking-tight pt-1">
                  RECENT RESEARCH
                </h3>
                
                <p className="text-xs text-[#60758A] leading-relaxed">
                  {recentDocs.length > 0
                    ? `Latest brief: "${recentDocs[0].title}"`
                    : 'Access and review your synthesized academic literature briefs.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between text-xs font-mono">
                <span className="text-[#718198] text-[11px]">
                  {recentDocs.length > 0 ? `${recentDocs.length} Recent Briefs` : '0 Briefs Saved'}
                </span>
                <Link
                  href={recentDocs.length > 0 ? `/research/library/${recentDocs[0].id}` : '/research/library'}
                  className="text-[#149FC4] font-bold hover:underline flex items-center gap-1"
                >
                  <span>VIEW BRIEF</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* CARD 2: SAVED BRIEFS */}
            <div className="bg-[#FFFFFF] border border-[#D9E2EC] rounded-2xl p-6 shadow-[0_4px_18px_rgba(40,70,100,0.05)] space-y-4 flex flex-col justify-between hover:border-[#C5D2E0] transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#EAE7FF] text-[#6259B4] border border-[#D9D5FB]">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#6259B4] bg-[#EAE7FF] px-2 py-0.5 rounded-md">
                    ARCHIVE
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#172033] tracking-tight pt-1">
                  SAVED BRIEFS
                </h3>

                <p className="text-xs text-[#60758A] leading-relaxed">
                  Collected literature, citations, and annotations saved to your permanent library.
                </p>
              </div>

              <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between text-xs font-mono">
                <span className="text-[#718198] text-[11px]">
                  {totalSavedCount > 0 ? `${totalSavedCount} Saved Items` : 'Library Ready'}
                </span>
                <Link
                  href="/research/library"
                  className="text-[#149FC4] font-bold hover:underline flex items-center gap-1"
                >
                  <span>OPEN ARCHIVE</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* CARD 3: KNOWLEDGE DISCOVERIES */}
            <div className="bg-[#FFFFFF] border border-[#D9E2EC] rounded-2xl p-6 shadow-[0_4px_18px_rgba(40,70,100,0.05)] space-y-4 flex flex-col justify-between hover:border-[#C5D2E0] transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#DDF6EC] text-[#218A69] border border-[#BDEBD9]">
                    <GitFork className="w-4 h-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#218A69] bg-[#DDF6EC] px-2 py-0.5 rounded-md">
                    NEURAL GRAPH
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#172033] tracking-tight pt-1">
                  KNOWLEDGE DISCOVERIES
                </h3>

                <p className="text-xs text-[#60758A] leading-relaxed">
                  Interactive concept maps derived from academic paper citations and evidence nodes.
                </p>
              </div>

              <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between text-xs font-mono">
                <span className="text-[#718198] text-[11px]">
                  Live Graph Active
                </span>
                <Link
                  href="/research/intelligence"
                  className="text-[#7770D8] font-bold hover:underline flex items-center gap-1"
                >
                  <span>EXPLORE GRAPH</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── RESULTS SECTION (SHOWN AFTER SEARCH EXECUTION) ──────────── */}
      {(hasSearched || isLoading || errorMsg) && (
        <ResearchResults
          results={filteredAndSortedResults}
          sources={sourceCounts}
          providerStatus={providerStatus}
          intent={searchIntent}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          isLoading={isLoading}
          errorMsg={errorMsg}
          onRetry={() => handleExecuteSearch(activeQuery)}
          query={activeQuery}
          researchBrief={researchBrief}
          isSynthesizing={isSynthesizing}
          synthesisError={synthesisError}
          onSynthesize={handleSynthesizeResearch}
          onCreateLearningPath={handleCreateLearningPath}
          isCreatingPath={isCreatingPath}
          creationProgressStep={creationProgressStep}
          existingPathId={existingPathId}
          onNavigateToExistingPath={(pathId) => router.push(`/learn/${pathId}`)}
        />
      )}
    </div>
  );
}
