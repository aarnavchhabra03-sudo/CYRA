'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LiteratureReview as LiteratureReviewModel } from '@/lib/research/types';
import { LiteratureThemes } from './literature-themes';
import { LiteratureConsensus } from './literature-consensus';
import { LiteratureGaps } from './literature-gaps';
import { LiteratureOpenQuestions } from './literature-open-questions';
import { LiteratureCitations } from './literature-citations';
import { ResearchExportDialog } from './research-export-dialog';
import { ResearchAnnotationPanel } from './research-annotation-panel';
import { Sparkles, GraduationCap, BookOpen, Layers, Download, StickyNote } from 'lucide-react';

interface LiteratureReviewProps {
  review: LiteratureReviewModel;
}

export const LiteratureReview: React.FC<LiteratureReviewProps> = ({ review }) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(false);

  const dateStr = new Date(review.generatedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const firstDocId = review.citations?.[0]?.id || review.id;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 text-left relative">
      {/* Export Dialog */}
      <ResearchExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentType="literature_review"
        documentId={review.id}
        documentData={review}
        title={review.title || 'Multi-Source Literature Review'}
      />

      {/* Annotation Panel */}
      {firstDocId && (
        <ResearchAnnotationPanel
          isOpen={isAnnotationPanelOpen}
          onClose={() => setIsAnnotationPanelOpen(false)}
          researchDocumentId={firstDocId}
          documentTitle={review.title || 'Literature Review Workspace'}
        />
      )}

      {/* Top Header Card */}
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--accent)]/30 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>CYRA Multi-Source Literature Review</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-[var(--text-secondary)] hidden sm:block">
              Generated {dateStr} • Scope: <span className="uppercase text-cyan-400 font-bold">{review.scope}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsAnnotationPanelOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] text-xs font-mono font-bold text-[var(--text-primary)] transition-all ml-auto"
            >
              <StickyNote className="w-3.5 h-3.5 text-cyan-400" />
              <span>NOTES</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] text-xs font-mono font-bold text-[var(--text-primary)] transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXPORT REVIEW</span>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-extrabold text-[var(--text-primary)] leading-tight">
            {review.title}
          </h1>
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            RESEARCH QUESTION: "{review.researchQuestion}"
          </p>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <section className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
          EXECUTIVE SUMMARY
        </span>
        <div className="text-sm text-[var(--text-primary)] font-sans leading-relaxed whitespace-pre-line">
          {review.executiveSummary}
        </div>
      </section>

      {/* 2. Key Synthesis Themes */}
      <LiteratureThemes themes={review.themes} />

      {/* 3. Consensus & Divergence */}
      <LiteratureConsensus agreements={review.agreements} disagreements={review.disagreements} />

      {/* 4. Identified Research Gaps */}
      <LiteratureGaps gaps={review.researchGaps} />

      {/* 5. Grounded Open Questions */}
      <LiteratureOpenQuestions questions={review.openQuestions} />

      {/* 6. What to Learn Next (Learning Recommendations) */}
      {review.learningRecommendations && review.learningRecommendations.length > 0 && (
        <section className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-4 text-left">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            <GraduationCap className="w-4 h-4 flex-shrink-0" />
            <span>WHAT TO LEARN NEXT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.learningRecommendations.map((rec, idx) => {
              const recQuery = encodeURIComponent(`Explain ${rec} in detail`);

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-semibold text-[var(--text-primary)] font-sans">
                    {idx + 1}. {rec}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/research?query=${recQuery}`}
                      className="text-cyan-400 hover:underline font-mono text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>RESEARCH</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Analyzed Source Index */}
      <LiteratureCitations citations={review.citations} />
    </div>
  );
};

export default LiteratureReview;
