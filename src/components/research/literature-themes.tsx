'use client';

import React from 'react';
import { LiteratureTheme } from '@/lib/research/types';
import { Layers } from 'lucide-react';

interface LiteratureThemesProps {
  themes: LiteratureTheme[];
}

export const LiteratureThemes: React.FC<LiteratureThemesProps> = ({ themes }) => {
  if (!themes || themes.length === 0) return null;

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
        <Layers className="w-4 h-4 flex-shrink-0" />
        <span>Key Synthesis Themes</span>
      </div>

      <div className="space-y-3">
        {themes.map((t, idx) => (
          <div
            key={t.id || idx}
            className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 font-bold">
                0{idx + 1}
              </span>
              <h4 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                {t.theme}
              </h4>
            </div>

            <p className="text-xs text-[var(--text-primary)] font-sans leading-relaxed">
              {t.explanation}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LiteratureThemes;
