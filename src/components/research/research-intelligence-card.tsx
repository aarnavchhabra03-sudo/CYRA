'use client';

import React from 'react';
import Link from 'next/link';
import { ResearchRecommendation } from '@/lib/research/types';
import { Sparkles, ArrowRight, BookOpen, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface ResearchIntelligenceCardProps {
  rec: ResearchRecommendation;
}

export const ResearchIntelligenceCard: React.FC<ResearchIntelligenceCardProps> = ({ rec }) => {
  const getBadgeStyle = (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (priority) {
      case 'HIGH':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'MEDIUM':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default:
        return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border)]';
    }
  };

  const encodedQuery = encodeURIComponent(rec.searchQuery);

  return (
    <div className="group p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-200 flex flex-col justify-between gap-4 text-left shadow-sm">
      {/* Top Tag & Priority */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
            RESEARCH NEXT
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getBadgeStyle(
              rec.priority
            )}`}
          >
            {rec.priority} PRIORITY
          </span>
        </div>

        {/* Topic Title */}
        <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug group-hover:text-cyan-400 transition-colors">
          {rec.topic}
        </h3>

        {/* Related Concept */}
        {rec.relatedConcept && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">RELATED CONCEPT:</span>
            <span className="text-cyan-400 font-semibold">{rec.relatedConcept}</span>
          </div>
        )}

        {/* Reason Explanations */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1 text-xs">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            WHY CYRA RECOMMENDS THIS
          </span>
          <p className="text-xs text-[var(--text-primary)] font-sans leading-relaxed">
            {rec.reason}
          </p>
          {rec.reasonsList && rec.reasonsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {rec.reasonsList.map((r, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--card)] px-2 py-0.5 rounded border border-[var(--border)]"
                >
                  <span>•</span>
                  <span>{r}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-[var(--border)]">
        {rec.relatedLearningPathId && (
          <Link
            href={`/learn/${rec.relatedLearningPathId}`}
            className="inline-flex items-center gap-1 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>REVIEW LESSON</span>
          </Link>
        )}

        <Link
          href={`/research?query=${encodedQuery}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-semibold transition-all ml-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>RESEARCH THIS</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default ResearchIntelligenceCard;
