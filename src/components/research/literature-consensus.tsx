'use client';

import React from 'react';
import { LiteratureAgreement, LiteratureDisagreement } from '@/lib/research/types';
import { CheckCircle2, GitCompare } from 'lucide-react';

interface LiteratureConsensusProps {
  agreements: LiteratureAgreement[];
  disagreements: LiteratureDisagreement[];
}

export const LiteratureConsensus: React.FC<LiteratureConsensusProps> = ({
  agreements,
  disagreements,
}) => {
  return (
    <div className="space-y-6 text-left">
      {/* 1. Where Sources Agree */}
      {agreements && agreements.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Where Sources Agree (Consensus)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agreements.map((a, idx) => (
              <div
                key={a.id || idx}
                className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2 text-left"
              >
                <h4 className="text-xs font-bold text-emerald-400 font-mono">
                  {a.claim}
                </h4>
                <p className="text-xs text-[var(--text-primary)] font-sans leading-relaxed">
                  {a.supportingSummary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Where Sources Differ */}
      {disagreements && disagreements.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            <GitCompare className="w-4 h-4 flex-shrink-0" />
            <span>Where Sources Differ (Divergence)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disagreements.map((d, idx) => (
              <div
                key={d.id || idx}
                className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3 text-left"
              >
                <h4 className="text-xs font-bold text-amber-400 font-mono">
                  {d.topic}
                </h4>

                <div className="grid grid-cols-1 gap-2 text-xs font-sans">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block">
                      Perspective A
                    </span>
                    <p className="text-[var(--text-primary)]">{d.perspectiveA}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block">
                      Perspective B
                    </span>
                    <p className="text-[var(--text-primary)]">{d.perspectiveB}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default LiteratureConsensus;
