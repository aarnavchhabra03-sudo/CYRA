'use client';

import React from 'react';
import Link from 'next/link';
import { ResearchLearningConnection } from '@/lib/research/types';
import { GraduationCap, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

interface ResearchLearningConnectionsProps {
  connections: ResearchLearningConnection[];
}

export const ResearchLearningConnections: React.FC<ResearchLearningConnectionsProps> = ({
  connections,
}) => {
  if (!connections || connections.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
        <GraduationCap className="w-4 h-4 flex-shrink-0" />
        <span>Your Learning ↔ Research Connections</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => {
          const recQuery = conn.topRecommendation
            ? encodeURIComponent(conn.topRecommendation.searchQuery)
            : encodeURIComponent(`Research preprints for ${conn.learningPathTitle}`);

          return (
            <div
              key={conn.learningPathId}
              className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">
                    {conn.learningPathTitle}
                  </h4>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {conn.progressPercent}% course completion
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, conn.progressPercent))}%` }}
                />
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs font-mono p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Briefs</span>
                  <span className="font-bold text-[var(--text-primary)]">{conn.linkedBriefsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Explored</span>
                  <span className="font-bold text-cyan-400">{conn.exploredTopicsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Gaps</span>
                  <span className="font-bold text-amber-400">{conn.knowledgeGapsCount}</span>
                </div>
              </div>

              {/* Recommendation highlight */}
              {conn.topRecommendation && (
                <div className="text-xs font-mono space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block font-bold">
                    RECOMMENDED RESEARCH NEXT
                  </span>
                  <p className="text-xs text-cyan-400 font-semibold truncate">
                    {conn.topRecommendation.topic}
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--border)]">
                <Link
                  href={`/learn/${conn.learningPathId}`}
                  className="inline-flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>OPEN COURSE</span>
                </Link>

                <Link
                  href={`/research?query=${recQuery}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-medium text-xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>RESEARCH NEXT</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ResearchLearningConnections;
