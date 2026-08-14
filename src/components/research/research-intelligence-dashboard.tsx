'use client';

import React from 'react';
import Link from 'next/link';
import { ResearchIntelligenceData } from '@/lib/research/types';
import { ResearchTopicRecommendations } from './research-topic-recommendations';
import { ResearchKnowledgeGaps } from './research-knowledge-gaps';
import { ResearchActivity } from './research-activity';
import { ResearchLearningConnections } from './research-learning-connections';
import { Compass, GraduationCap, Search, Layers, BookOpen, Sparkles } from 'lucide-react';

interface ResearchIntelligenceDashboardProps {
  data: ResearchIntelligenceData;
}

export const ResearchIntelligenceDashboard: React.FC<ResearchIntelligenceDashboardProps> = ({ data }) => {
  const {
    hasLearningHistory,
    currentLearningPath,
    knowledgeGaps,
    recommendations,
    recentActivity,
    learningConnections,
  } = data;

  // Empty State for Brand New Users
  if (!hasLearningHistory && (!recentActivity || recentActivity.length === 0)) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 text-left">
        {/* Header */}
        <div className="space-y-2 pb-4 border-b border-[var(--border)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>CYRA Personal Research Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            RESEARCH INTELLIGENCE
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)]">
            Research recommendations based on your learning progress, knowledge graph, mastery decay, and research history.
          </p>
        </div>

        {/* Empty State Banner */}
        <div className="p-10 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4 max-w-2xl mx-auto">
          <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              CYRA needs a little more learning history before it can personalize research recommendations.
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Start an active learning path or run your first academic search in the Research Lab.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3 flex-wrap">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-semibold text-xs transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>START A LEARNING PATH</span>
            </Link>
            <Link
              href="/research"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-xs transition-all"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span>EXPLORE RESEARCH</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-9 text-left">
      {/* Dashboard Top Header */}
      <div className="space-y-2 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>CYRA Personal Research Intelligence</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/research"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Research Workstation</span>
            </Link>

            <Link
              href="/research/library"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Library Archive</span>
            </Link>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          RESEARCH INTELLIGENCE
        </h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-3xl">
          Research recommendations based on your learning progress, knowledge graph, mastery decay, and research history.
        </p>
      </div>

      {/* Current Active Learning Path Summary Banner */}
      {currentLearningPath && (
        <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--accent)]/30 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                ACTIVE LEARNING PATH
              </span>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {currentLearningPath.title}
              </h2>
            </div>

            <div className="text-xs font-mono text-[var(--text-secondary)] text-right">
              <span>{currentLearningPath.completedLessons} / {currentLearningPath.totalLessons} lessons completed</span>
              <span className="font-bold text-cyan-400 ml-2">({currentLearningPath.progressPercent}%)</span>
            </div>
          </div>

          {/* Thin Progress Bar */}
          <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, currentLearningPath.progressPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-1 flex-wrap">
            <span className="truncate">
              Current Lesson: <strong className="text-[var(--text-primary)]">{currentLearningPath.currentLessonTitle}</strong>
            </span>
            <Link
              href={`/learn/${currentLearningPath.id}`}
              className="text-cyan-400 hover:underline font-bold inline-flex items-center gap-1 ml-auto"
            >
              <span>Continue Course</span>
              <Sparkles className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 1. Personalized Recommendations Section */}
      <ResearchTopicRecommendations recommendations={recommendations} />

      {/* 2. Knowledge Gaps Section */}
      <ResearchKnowledgeGaps gaps={knowledgeGaps} />

      {/* 3. Learning ↔ Research Connections */}
      <ResearchLearningConnections connections={learningConnections} />

      {/* 4. Recent Research Activity Timeline */}
      <ResearchActivity activity={recentActivity} />
    </div>
  );
};

export default ResearchIntelligenceDashboard;
