'use client';

import React from 'react';
import { ResearchSource, ProviderStatus, ResearchIntent, ResearchBrief } from '@/lib/research/types';
import { ResearchResultCard } from './research-result-card';
import { ResearchBriefComponent } from './research-brief';
import { ArrowUpDown, AlertCircle, RefreshCw, Layers, Compass, Sparkles } from 'lucide-react';

interface ResearchResultsProps {
  results: ResearchSource[];
  sources: {
    arxiv: number;
    academic: number;
    web: number;
  };
  providerStatus?: ProviderStatus;
  intent?: ResearchIntent;
  activeFilter: 'all' | 'academic' | 'arxiv' | 'web';
  onFilterChange: (filter: 'all' | 'academic' | 'arxiv' | 'web') => void;
  sortBy: 'relevance' | 'newest';
  onSortChange: (sort: 'relevance' | 'newest') => void;
  isLoading: boolean;
  errorMsg: string | null;
  onRetry: () => void;

  // Stage 13.2 Synthesis Props
  query?: string;
  researchBrief?: ResearchBrief | null;
  isSynthesizing?: boolean;
  synthesisError?: string | null;
  onSynthesize?: () => void;

  // Stage 13.3 Learn Props
  onCreateLearningPath?: (brief: ResearchBrief) => void;
  isCreatingPath?: boolean;
  creationProgressStep?: string | null;
  existingPathId?: string | null;
  onNavigateToExistingPath?: (pathId: string) => void;
}

export const ResearchResults: React.FC<ResearchResultsProps> = ({
  results,
  sources,
  providerStatus,
  intent,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  isLoading,
  errorMsg,
  onRetry,
  query = '',
  researchBrief,
  isSynthesizing = false,
  synthesisError = null,
  onSynthesize,
  onCreateLearningPath,
  isCreatingPath = false,
  creationProgressStep = null,
  existingPathId = null,
  onNavigateToExistingPath,
}) => {
  const totalAvailable = sources.arxiv + sources.academic + sources.web;

  // 1. Initial Search Skeleton State
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-pulse text-left">
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Researching Academic Index</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            Searching ArXiv preprints... Checking scholarly web literature... Ranking relevant sources...
          </p>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-[var(--bg-elevated)] rounded" />
                <div className="h-4 w-16 bg-[var(--bg-elevated)] rounded" />
              </div>
              <div className="h-5 w-3/4 bg-[var(--bg-elevated)] rounded" />
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[var(--bg-elevated)] rounded" />
                <div className="h-3 w-5/6 bg-[var(--bg-elevated)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Search Error State
  if (errorMsg) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-4 text-left">
        <div className="flex items-center justify-center gap-2 text-red-400 font-semibold text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Research couldn't reach the source providers.</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] text-center leading-relaxed">
          {errorMsg}
        </p>
        <div className="flex justify-center pt-2">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-medium transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  const isArxivDown = providerStatus?.arxiv === 'failed' || providerStatus?.arxiv === 'rate_limited';
  const isTavilyDown = providerStatus?.tavily === 'failed';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-left">
      {/* Partial Provider Failure Notice */}
      {(isArxivDown || isTavilyDown) && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-mono text-amber-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {isArxivDown && isTavilyDown
                ? 'Search providers temporarily restricted.'
                : isArxivDown
                ? 'ArXiv provider temporarily unavailable · Web results active'
                : 'Tavily web search unavailable · ArXiv results active'}
            </span>
          </div>
          <button onClick={onRetry} className="hover:underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Synthesis Active Banner */}
      {isSynthesizing && (
        <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--accent)]/40 space-y-2 text-left animate-pulse">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>SYNTHESIZING RESEARCH</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono">
            Comparing retrieved sources... Identifying key findings... Building evidence map...
          </p>
        </div>
      )}

      {/* Synthesis Failure Banner */}
      {synthesisError && !isSynthesizing && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3 text-xs text-red-400 text-left flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>CYRA couldn't complete the research synthesis.</span>
          </div>
          {onSynthesize && (
            <button
              onClick={onSynthesize}
              className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-white font-medium text-xs hover:opacity-90 transition-all ml-auto"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Render Grounded Research Brief if Available */}
      {researchBrief && !isSynthesizing && (
        <ResearchBriefComponent
          brief={researchBrief}
          query={query}
          intent={intent}
          onCreateLearningPath={onCreateLearningPath}
          isCreatingPath={isCreatingPath}
          creationProgressStep={creationProgressStep}
          existingPathId={existingPathId}
          onNavigateToExistingPath={onNavigateToExistingPath}
        />
      )}

      {/* Results Header Bar with Breakdown, Intent, Synthesize Action & Sort Controls */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border)] flex-wrap">
        {/* Count & Detailed Source Breakdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Research Results
          </span>

          <span className="text-xs font-mono text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{results.length}</strong> sources
            <span className="text-[var(--text-muted)] ml-1">
              ({sources.academic + sources.arxiv} academic · {sources.arxiv} ArXiv · {sources.web} web)
            </span>
          </span>

          {intent && intent !== 'general' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">
              <Compass className="w-3 h-3" />
              <span>Intent: {intent.replace('_', ' ')}</span>
            </span>
          )}
        </div>

        {/* Action Controls: Synthesize Button, Category Filter & Sort */}
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          {/* Explicit Synthesize Research Button */}
          {results.length > 0 && onSynthesize && !isSynthesizing && (
            <button
              onClick={onSynthesize}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-medium transition-all shadow-sm"
              title="Synthesize top retrieved sources into an objective research brief"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthesize Research</span>
            </button>
          )}

          {/* Category Filter Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeFilter === 'all'
                  ? 'bg-[var(--card)] text-[var(--text-primary)] shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({totalAvailable})
            </button>
            <button
              onClick={() => onFilterChange('academic')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeFilter === 'academic'
                  ? 'bg-[var(--card)] text-cyan-400 shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Academic ({sources.academic + sources.arxiv})
            </button>
            <button
              onClick={() => onFilterChange('arxiv')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeFilter === 'arxiv'
                  ? 'bg-[var(--card)] text-indigo-400 shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              ArXiv ({sources.arxiv})
            </button>
            <button
              onClick={() => onFilterChange('web')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeFilter === 'web'
                  ? 'bg-[var(--card)] text-[var(--text-primary)] shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Web ({sources.web})
            </button>
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2.5 py-1">
            <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'relevance' | 'newest')}
              className="bg-transparent text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
            >
              <option value="relevance" className="bg-[var(--card)]">Relevance</option>
              <option value="newest" className="bg-[var(--card)]">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty Results Case */}
      {results.length === 0 ? (
        <div className="w-full max-w-xl mx-auto p-8 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center space-y-3">
          <Layers className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">No sources found for this filter</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Try expanding your search filter to "All" or adjusting your research query keywords.
          </p>
          <button
            onClick={() => onFilterChange('all')}
            className="mt-2 text-xs text-cyan-400 hover:underline font-mono"
          >
            Reset Filter to All Sources
          </button>
        </div>
      ) : (
        /* Results Cards List */
        <div className="space-y-4">
          {results.map((result) => (
            <ResearchResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ResearchResults;
