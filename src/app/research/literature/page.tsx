'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SavedResearchDocument, LiteratureReview as LiteratureReviewModel } from '@/lib/research/types';
import { LiteratureSourceSelector } from '@/components/research/literature-source-selector';
import { LiteratureReview } from '@/components/research/literature-review';
import { Layers, Bookmark, Sparkles, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResearchLiteraturePage() {
  const [documents, setDocuments] = useState<SavedResearchDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [researchQuestion, setResearchQuestion] = useState('');
  const [scope, setScope] = useState<'comparative' | 'thematic' | 'general'>('comparative');
  const [review, setReview] = useState<LiteratureReviewModel | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch user's saved research documents
  useEffect(() => {
    const fetchDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const res = await fetch('/api/research/saved?limit=50');
        const json = await res.json();
        if (res.ok && json.success) {
          const docs = json.data || [];
          setDocuments(docs);
          // Pre-select first 2-3 documents if available
          if (docs.length >= 2) {
            setSelectedIds(docs.slice(0, 3).map((d: any) => d.id));
          }
        }
      } catch (err) {
        console.error('[LITERATURE PAGE] Error fetching documents:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    fetchDocs();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBuildReview = async () => {
    if (selectedIds.length < 2) {
      setErrorMsg('Select at least 2 research investigations.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/research/literature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          researchDocumentIds: selectedIds,
          researchQuestion: researchQuestion.trim() || undefined,
          scope,
          maxSources: 12,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Failed to synthesize literature review.');
      }

      setReview(json.data);
    } catch (err: any) {
      console.error('[LITERATURE PAGE] Synthesis error:', err);
      setErrorMsg(err.message || 'Failed to generate multi-source literature review.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-8 bg-[var(--bg)] text-[var(--text-primary)] text-left">
      {/* Top Bar Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>CYRA Literature Review Lab</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            MULTI-SOURCE LITERATURE LAB
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)]">
            Combine multiple research investigations into one traceable literature review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/research/library"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
            <span>Library</span>
          </Link>
        </div>
      </div>

      {/* Main Workspace Form & Output */}
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs hover:underline uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Source Selector Component */}
        <LiteratureSourceSelector
          documents={documents}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />

        {/* 2. Review Configuration Box */}
        <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
            REVIEW CONFIGURATION
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Research Question */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[var(--text-secondary)] block font-bold">
                Synthesized Research Question (Optional)
              </label>
              <input
                type="text"
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                placeholder="e.g. Modern TCP congestion control algorithms & performance"
                className="w-full px-3.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-400 font-sans"
              />
            </div>

            {/* Review Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[var(--text-secondary)] block font-bold">
                Review Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-400 font-mono"
              >
                <option value="comparative">Comparative</option>
                <option value="thematic">Thematic</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-4 flex-wrap border-t border-[var(--border)]">
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {selectedIds.length} investigations selected • Maximum 12 unique underlying sources
            </span>

            <button
              onClick={handleBuildReview}
              disabled={isGenerating || selectedIds.length < 2}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold transition-all ml-auto"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Literature Review...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>BUILD LITERATURE REVIEW</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Generated Literature Review Output */}
        {review && <LiteratureReview review={review} />}
      </div>
    </div>
  );
}
