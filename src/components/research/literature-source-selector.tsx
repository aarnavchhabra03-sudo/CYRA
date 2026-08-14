'use client';

import React from 'react';
import { SavedResearchDocument } from '@/lib/research/types';
import { CheckSquare, Square, FileText, AlertCircle } from 'lucide-react';

interface LiteratureSourceSelectorProps {
  documents: SavedResearchDocument[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export const LiteratureSourceSelector: React.FC<LiteratureSourceSelectorProps> = ({
  documents,
  selectedIds,
  onToggleSelect,
}) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center text-xs font-mono text-[var(--text-secondary)]">
        No saved research documents found in your library. Run a search and save briefs first!
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Select Saved Investigations ({selectedIds.length} / 6 Selected)
        </span>
        {selectedIds.length < 2 && (
          <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Select at least 2 research investigations</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {documents.map((doc) => {
          const isSelected = selectedIds.includes(doc.id);
          const isDisabled = !isSelected && selectedIds.length >= 6;

          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => !isDisabled && onToggleSelect(doc.id)}
              disabled={isDisabled}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-400 text-[var(--text-primary)] shadow-sm'
                  : isDisabled
                  ? 'bg-[var(--bg-elevated)] border-[var(--border)] opacity-40 cursor-not-allowed'
                  : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-xs font-bold leading-snug line-clamp-2">
                  {doc.title}
                </span>
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-secondary)] w-full">
                <span className="uppercase">{doc.intent || 'GENERAL'}</span>
                <span>{doc.brief?.citations?.length || 0} sources</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiteratureSourceSelector;
