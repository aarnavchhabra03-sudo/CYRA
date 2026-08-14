'use client';

import React from 'react';
import { LiteratureCitation } from '@/lib/research/types';
import { FileText, ExternalLink, ShieldCheck, Globe } from 'lucide-react';

interface LiteratureCitationsProps {
  citations: LiteratureCitation[];
}

export const LiteratureCitations: React.FC<LiteratureCitationsProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <section className="space-y-4 text-left pt-4 border-t border-[var(--border)]">
      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span>Analyzed Source Index ({citations.length} Unique Sources)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {citations.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] flex flex-col justify-between gap-3 text-xs text-left"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-cyan-400 font-bold">[{c.index}]</span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 rounded">
                  {c.sourceType}
                </span>
              </div>

              <h4 className="font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                {c.title}
              </h4>

              {c.snippet && (
                <p className="text-[11px] text-[var(--text-muted)] font-sans line-clamp-3">
                  {c.snippet}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--border)] text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span className="truncate max-w-[150px]">{c.domain}</span>
              </div>

              {c.url && c.url !== '#' && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-bold"
                >
                  <span>Open Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LiteratureCitations;
