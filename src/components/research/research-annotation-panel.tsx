'use client';

import React, { useState, useEffect } from 'react';
import { ResearchAnnotation, ResearchAnnotationType } from '@/lib/research/types';
import { ResearchAnnotationEditor } from './research-annotation-editor';
import { Plus, X, Trash2, Edit2, Bookmark, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface ResearchAnnotationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  researchDocumentId: string;
  documentTitle?: string;
  initialCitation?: {
    id: string;
    title: string;
    url: string;
  } | null;
  initialSelectedText?: string | null;
  onAnnotationCountChange?: (count: number) => void;
}

export const ResearchAnnotationPanel: React.FC<ResearchAnnotationPanelProps> = ({
  isOpen,
  onClose,
  researchDocumentId,
  documentTitle = 'Research Investigation',
  initialCitation = null,
  initialSelectedText = null,
  onAnnotationCountChange,
}) => {
  const [annotations, setAnnotations] = useState<ResearchAnnotation[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'NOTE' | 'HIGHLIGHT' | 'EVIDENCE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load annotations from API
  const fetchAnnotations = async () => {
    if (!researchDocumentId) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/research/annotations?documentId=${researchDocumentId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch annotations.');
      }
      setAnnotations(json.data || []);
      if (onAnnotationCountChange) {
        onAnnotationCountChange((json.data || []).length);
      }
    } catch (err: any) {
      console.error('[ANNOTATION PANEL] Fetch error:', err);
      setErrorMsg(err.message || 'Failed to load annotations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && researchDocumentId) {
      fetchAnnotations();
      if (initialCitation || initialSelectedText) {
        setIsCreating(true);
      }
    }
  }, [isOpen, researchDocumentId, initialCitation, initialSelectedText]);

  if (!isOpen) return null;

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/research/annotations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete annotation.');

      const nextList = annotations.filter((a) => a.id !== id);
      setAnnotations(nextList);
      if (onAnnotationCountChange) onAnnotationCountChange(nextList.length);
    } catch (err: any) {
      console.error('[ANNOTATION PANEL] Delete error:', err);
      setErrorMsg('Failed to delete annotation.');
    }
  };

  const filtered = annotations.filter((a) => {
    if (filter === 'ALL') return true;
    return a.annotationType.toUpperCase() === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in text-left">
      <div className="w-full max-w-md h-full bg-[var(--card)] border-l border-[var(--border)] p-6 space-y-6 flex flex-col justify-between shadow-2xl text-[var(--text-primary)] overflow-y-auto">
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                PERSONAL RESEARCH WORKSPACE
              </span>
              <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug truncate max-w-xs">
                {documentTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-xs">
            <span className="text-[var(--text-secondary)] font-bold">
              {annotations.length} {annotations.length === 1 ? 'ANNOTATION' : 'ANNOTATIONS'}
            </span>

            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-bold text-xs hover:opacity-90 transition-all ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD NOTE</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-[11px] text-center font-bold">
            {(['ALL', 'NOTE', 'HIGHLIGHT', 'EVIDENCE'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`py-1 rounded transition-colors ${
                  filter === tab
                    ? 'bg-[var(--card)] text-cyan-400 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Editor Mode */}
          {isCreating && (
            <ResearchAnnotationEditor
              researchDocumentId={researchDocumentId}
              citationId={initialCitation?.id}
              sourceTitle={initialCitation?.title}
              sourceUrl={initialCitation?.url}
              initialSelectedText={initialSelectedText}
              onSaveSuccess={(newAnn) => {
                const nextList = [newAnn, ...annotations];
                setAnnotations(nextList);
                if (onAnnotationCountChange) onAnnotationCountChange(nextList.length);
                setIsCreating(false);
              }}
              onCancel={() => setIsCreating(false)}
            />
          )}

          {/* Annotation Cards List */}
          {isLoading ? (
            <div className="py-12 text-center font-mono text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading annotations...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-[var(--border)] rounded-xl p-6">
              <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-xs font-mono text-[var(--text-secondary)]">No annotations found in this view.</p>
              <p className="text-[11px] font-mono text-[var(--text-muted)]">Add private notes or highlight evidence passages.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {filtered.map((item) => (
                <div key={item.id}>
                  {editingId === item.id ? (
                    <ResearchAnnotationEditor
                      researchDocumentId={researchDocumentId}
                      editingAnnotationId={item.id}
                      initialType={item.annotationType}
                      initialNote={item.note}
                      initialSelectedText={item.selectedText}
                      sourceTitle={item.sourceTitle}
                      onSaveSuccess={(updatedAnn) => {
                        const nextList = annotations.map((a) => (a.id === updatedAnn.id ? updatedAnn : a));
                        setAnnotations(nextList);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] space-y-2.5 transition-all text-left text-xs font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            item.annotationType === 'evidence'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : item.annotationType === 'highlight'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-[var(--card)] text-[var(--text-secondary)] border-[var(--border)]'
                          }`}
                        >
                          {item.annotationType}
                        </span>

                        <div className="flex items-center gap-1 text-[var(--text-muted)] text-[10px]">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={() => setEditingId(item.id)}
                            className="p-1 hover:text-[var(--text-primary)] transition-colors"
                            title="Edit Note"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 hover:text-red-400 transition-colors"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {item.sourceTitle && (
                        <div className="text-[11px] text-cyan-400 font-bold truncate">
                          Source: {item.sourceTitle}
                        </div>
                      )}

                      {item.selectedText && (
                        <div className="p-2.5 rounded bg-[var(--card)] border-l-2 border-amber-400 italic text-[11px] font-sans text-[var(--text-secondary)] space-y-1">
                          <span className="text-[10px] font-mono text-[var(--text-muted)] not-italic block uppercase">EVIDENCE PASSAGE:</span>
                          <p className="line-clamp-3">"{item.selectedText}"</p>
                        </div>
                      )}

                      <div className="text-xs font-sans text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                        {item.note}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-3 border-t border-[var(--border)] text-center font-mono text-xs">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchAnnotationPanel;
