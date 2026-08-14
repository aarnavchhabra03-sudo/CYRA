'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { SavedResearchDocument } from '@/lib/research/types';
import { ResearchLibraryCard } from './research-library-card';

interface ResearchLibraryGridProps {
  documents: SavedResearchDocument[];
  onDeleteDocument: (id: string) => Promise<void>;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export const ResearchLibraryGrid: React.FC<ResearchLibraryGridProps> = ({
  documents,
  onDeleteDocument,
  selectedIds = [],
  onToggleSelect,
}) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="p-12 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4 max-w-xl mx-auto">
        <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Your Research Library is empty</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
            Searches and AI Research Briefs you save will appear here for future study and course generation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left font-sans">
      {documents.map((doc) => (
        <ResearchLibraryCard
          key={doc.id}
          doc={doc}
          onDelete={onDeleteDocument}
          isSelected={selectedIds.includes(doc.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};

export default ResearchLibraryGrid;
