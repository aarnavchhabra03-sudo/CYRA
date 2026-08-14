'use client';

import React from 'react';
import { LiteratureResearchGap } from '@/lib/research/types';
import { AlertCircle } from 'lucide-react';

interface LiteratureGapsProps {
  gaps: LiteratureResearchGap[];
}

export const LiteratureGaps: React.FC<LiteratureGapsProps> = ({ gaps }) => {
  if (!gaps || gaps.length === 0) return null;

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Identified Research Gaps</span>
      </div>

      <div className="space-y-3">
        {gaps.map((g, idx) => (
          <div
            key={g.id || idx}
            className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-1 text-left"
          >
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-bold">
              GAP STATEMENT 0{idx + 1}
            </span>
            <p className="text-xs text-[var(--text-primary)] font-sans leading-relaxed">
              {g.statement}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LiteratureGaps;
