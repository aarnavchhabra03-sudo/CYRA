'use client';

import React, { useState } from 'react';
import { ResearchAnnotation, ResearchAnnotationType } from '@/lib/research/types';
import { FileText, ShieldCheck, Save, X, AlertCircle } from 'lucide-react';

interface ResearchAnnotationEditorProps {
  researchDocumentId: string;
  citationId?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  initialSelectedText?: string | null;
  initialNote?: string;
  initialType?: ResearchAnnotationType;
  editingAnnotationId?: string;
  onSaveSuccess: (annotation: ResearchAnnotation) => void;
  onCancel: () => void;
}

export const ResearchAnnotationEditor: React.FC<ResearchAnnotationEditorProps> = ({
  researchDocumentId,
  citationId = null,
  sourceTitle = null,
  sourceUrl = null,
  initialSelectedText = '',
  initialNote = '',
  initialType = 'note',
  editingAnnotationId,
  onSaveSuccess,
  onCancel,
}) => {
  const [annotationType, setAnnotationType] = useState<ResearchAnnotationType>(initialType);
  const [selectedText, setSelectedText] = useState(initialSelectedText || '');
  const [note, setNote] = useState(initialNote || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) {
      setErrorMsg('Personal note cannot be empty.');
      return;
    }

    if (note.length > 5000) {
      setErrorMsg('Personal note exceeds maximum 5000 character limit.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const isEditing = Boolean(editingAnnotationId);
      const url = isEditing
        ? `/api/research/annotations/${editingAnnotationId}`
        : '/api/research/annotations';

      const method = isEditing ? 'PATCH' : 'POST';

      const bodyData = isEditing
        ? { note, annotationType, selectedText: selectedText || null }
        : {
            researchDocumentId,
            citationId,
            annotationType,
            selectedText: selectedText || null,
            note,
            sourceTitle: sourceTitle || null,
            sourceUrl: sourceUrl || null,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save annotation.');
      }

      onSaveSuccess(json.data);
    } catch (err: any) {
      console.error('[ANNOTATION EDITOR] Save error:', err);
      setErrorMsg(err.message || 'Failed to save annotation.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-4 text-left font-mono text-xs text-[var(--text-primary)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
        <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
          {editingAnnotationId ? 'EDIT ANNOTATION' : 'CREATE RESEARCH NOTE'}
        </span>
        <button type="button" onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Type Selector */}
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--text-secondary)] uppercase font-bold block">Annotation Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'note', label: 'NOTE', desc: 'Neutral observation' },
            { id: 'highlight', label: 'HIGHLIGHT', desc: 'Amber passage' },
            { id: 'evidence', label: 'EVIDENCE', desc: 'Cyan key claim' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAnnotationType(item.id as any)}
              className={`p-2 rounded border text-center transition-all ${
                annotationType === item.id
                  ? item.id === 'evidence'
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold'
                    : item.id === 'highlight'
                    ? 'bg-amber-500/10 border-amber-400 text-amber-400 font-bold'
                    : 'bg-[var(--card)] border-[var(--text-primary)] text-[var(--text-primary)] font-bold'
                  : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              <span className="text-[11px] block">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Source Title */}
      {sourceTitle && (
        <div className="p-2 rounded bg-[var(--card)] border border-[var(--border)] space-y-0.5 text-[11px]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">SOURCE REFERENCE</span>
          <div className="text-[var(--text-primary)] truncate">{sourceTitle}</div>
        </div>
      )}

      {/* Selected Evidence Passages */}
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--text-secondary)] uppercase font-bold block">
          Selected Evidence / Passage (Optional)
        </label>
        <textarea
          value={selectedText}
          onChange={(e) => setSelectedText(e.target.value)}
          placeholder="Quote or evidence passage from research..."
          rows={2}
          className="w-full p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-sans text-[var(--text-primary)] focus:outline-none focus:border-cyan-400 transition-colors resize-y"
        />
      </div>

      {/* Personal Note */}
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--text-secondary)] uppercase font-bold block">
          Personal Observation / Note *
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why is this important? How does it fit your investigation?"
          rows={3}
          required
          className="w-full p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-sans text-[var(--text-primary)] focus:outline-none focus:border-cyan-400 transition-colors resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[var(--accent)] text-white font-bold hover:opacity-90 disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'SAVE NOTE'}</span>
        </button>
      </div>
    </form>
  );
};

export default ResearchAnnotationEditor;
