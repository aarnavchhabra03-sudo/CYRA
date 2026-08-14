'use client';

import React from 'react';
import Link from 'next/link';
import { ResearchKnowledgeGap } from '@/lib/research/types';
import { AlertCircle, RefreshCw, Lock, Sparkles } from 'lucide-react';

interface ResearchKnowledgeGapsProps {
  gaps: ResearchKnowledgeGap[];
}

export const ResearchKnowledgeGaps: React.FC<ResearchKnowledgeGapsProps> = ({ gaps }) => {
  if (!gaps || gaps.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Identified Knowledge Gaps ({gaps.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gaps.map((gap, idx) => {
          const encodedQuery = encodeURIComponent(`Explain ${gap.concept} in detail`);

          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                  {gap.concept}
                </h4>
                {gap.hasDecay ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                    <RefreshCw className="w-3 h-3" />
                    <span>Decay</span>
                  </span>
                ) : gap.isBlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-bold">
                    <Lock className="w-3 h-3" />
                    <span>Blocked</span>
                  </span>
                ) : null}
              </div>

              <div className="space-y-1 text-xs font-mono text-[var(--text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Effective Mastery:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {gap.effectiveMasteryScore}%
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">
                  {gap.reason}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/research?query=${encodedQuery}`}
                  className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Research Concept</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ResearchKnowledgeGaps;
