'use client';

import React, { useState } from 'react';
import { ResearchBrief } from '@/lib/research/types';
import { Bookmark, BookmarkCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface ResearchSaveButtonProps {
  query: string;
  brief: ResearchBrief;
  intent?: string;
  initialSaved?: boolean;
  onSavedSuccess?: (documentId: string) => void;
  className?: string;
}

export const ResearchSaveButton: React.FC<ResearchSaveButtonProps> = ({
  query,
  brief,
  intent = 'general',
  initialSaved = false,
  onSavedSuccess,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(initialSaved ? 'saved' : 'idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (status === 'saving' || status === 'saved') return;

    setStatus('saving');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/research/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          brief,
          intent,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save research document to library.');
      }

      setStatus('saved');
      if (onSavedSuccess && json.documentId) {
        onSavedSuccess(json.documentId);
      }
    } catch (err: any) {
      console.error('[RESEARCH SAVE BUTTON] Error saving document:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to save research document.');
    }
  };

  if (status === 'saved') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium ${className}`}
      >
        <BookmarkCheck className="w-3.5 h-3.5 flex-shrink-0" />
        <span>SAVED TO LIBRARY ✓</span>
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-mono font-medium cursor-not-allowed ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        <span>SAVING...</span>
      </button>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={handleSave}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono font-medium transition-all ${className}`}
        title={errorMsg || 'Failed to save'}
      >
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>TRY AGAIN</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSave}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono font-medium transition-all ${className}`}
    >
      <Bookmark className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
      <span>SAVE TO LIBRARY</span>
    </button>
  );
};

export default ResearchSaveButton;
