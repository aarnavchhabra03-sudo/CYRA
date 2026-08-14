'use client';

import React from 'react';
import Link from 'next/link';
import { SavedResearchLearningStatus } from '@/lib/research/types';
import { GraduationCap, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

interface ResearchLearningBannerProps {
  learningStatus: SavedResearchLearningStatus;
  nextBestAction?: {
    actionType?: string;
    targetLessonId?: string;
    targetLessonTitle?: string;
    targetConcept?: string;
    reasoning?: string;
  } | null;
  className?: string;
}

export const ResearchLearningBanner: React.FC<ResearchLearningBannerProps> = ({
  learningStatus,
  nextBestAction,
  className = '',
}) => {
  const {
    learningPathId,
    learningPathTitle,
    totalLessons,
    completedLessons,
    progressPercent,
    hasDecay,
  } = learningStatus;

  const isCompleted = progressPercent === 100 || (totalLessons > 0 && completedLessons >= totalLessons);

  // Target route: specific lesson if available, else course roadmap
  const continueHref = nextBestAction?.targetLessonId
    ? `/learn/${learningPathId}/lesson/${nextBestAction.targetLessonId}`
    : `/learn/${learningPathId}`;

  return (
    <div
      className={`w-full max-w-4xl mx-auto rounded-xl bg-[var(--card)] border border-[var(--accent)]/30 p-5 space-y-4 text-left shadow-sm transition-all ${className}`}
    >
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 flex-shrink-0" />
            <span>LINKED CYRA LEARNING PATH</span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {learningPathTitle}
          </h3>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-secondary)]">
          <span>{completedLessons} / {totalLessons} lessons ({progressPercent}%)</span>
          {hasDecay && !isCompleted && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
              <RefreshCw className="w-3 h-3" />
              <span>Review Needed</span>
            </span>
          )}
        </div>
      </div>

      {/* Thin Progress Bar */}
      <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isCompleted ? 'bg-emerald-400' : 'bg-[var(--accent)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>

      {/* Next Move Section */}
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1 max-w-xl">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {isCompleted ? 'STATUS' : 'NEXT MOVE'}
          </span>

          {isCompleted ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>You have completed all lessons in this research learning path!</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                {nextBestAction?.targetLessonTitle
                  ? nextBestAction.targetLessonTitle
                  : 'Continue Adaptive Course'}
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                {nextBestAction?.reasoning
                  ? nextBestAction.reasoning
                  : hasDecay
                  ? 'Memory decay detected. Reviewing key concepts recommended.'
                  : 'Pick up right where you left off.'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          <Link
            href={`/learn/${learningPathId}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--card)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>VIEW ROADMAP</span>
          </Link>

          <Link
            href={continueHref}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm ${
              isCompleted
                ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                : 'bg-[var(--accent)] hover:opacity-90 text-white'
            }`}
          >
            <span>{isCompleted ? 'REVIEW COURSE' : 'CONTINUE LEARNING'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResearchLearningBanner;
