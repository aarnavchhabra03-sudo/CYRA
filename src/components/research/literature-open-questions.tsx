'use client';

import React from 'react';
import Link from 'next/link';
import { LiteratureOpenQuestion } from '@/lib/research/types';
import { HelpCircle, Sparkles } from 'lucide-react';

interface LiteratureOpenQuestionsProps {
  questions: LiteratureOpenQuestion[];
}

export const LiteratureOpenQuestions: React.FC<LiteratureOpenQuestionsProps> = ({ questions }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
        <HelpCircle className="w-4 h-4 flex-shrink-0" />
        <span>Grounded Open Research Questions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questions.map((q, idx) => {
          const encodedQuery = encodeURIComponent(q.question);

          return (
            <div
              key={q.id || idx}
              className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] flex flex-col justify-between gap-3 text-left"
            >
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug font-sans">
                  "{q.question}"
                </h4>
                {q.motivation && (
                  <p className="text-[11px] text-[var(--text-muted)] font-sans leading-relaxed">
                    {q.motivation}
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end border-t border-[var(--border)]">
                <Link
                  href={`/research?query=${encodedQuery}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-medium text-xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>RESEARCH THIS QUESTION</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LiteratureOpenQuestions;
