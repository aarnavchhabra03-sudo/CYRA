'use client';

import React from 'react';
import Link from 'next/link';
import { ResearchActivityItem } from '@/lib/research/types';
import { History, FileText, ArrowRight } from 'lucide-react';

interface ResearchActivityProps {
  activity: ResearchActivityItem[];
}

export const ResearchActivity: React.FC<ResearchActivityProps> = ({ activity }) => {
  if (!activity || activity.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
          <History className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Recent Research Activity</span>
        </div>

        <Link
          href="/research/library"
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1"
        >
          <span>View Library Archive</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {activity.slice(0, 5).map((item) => {
          const dateStr = new Date(item.savedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] flex items-center justify-between gap-3 text-xs text-left transition-all"
            >
              <div className="flex items-center gap-3 truncate">
                <span className="text-[10px] font-mono text-[var(--text-muted)] flex-shrink-0">
                  {dateStr}
                </span>
                <Link
                  href={`/research/library/${item.id}`}
                  className="font-semibold text-[var(--text-primary)] hover:text-cyan-400 truncate font-sans"
                >
                  {item.title}
                </Link>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase flex-shrink-0 hidden sm:inline-block">
                  {item.intent ? item.intent.replace('_', ' ') : 'RESEARCH'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span>{item.citationCount} sources</span>
                </span>
                <Link
                  href={`/research/library/${item.id}`}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ResearchActivity;
