'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { SavedResearchDocument } from '@/lib/research/types';
import { ResearchLibraryGrid } from '@/components/research/research-library-grid';
import { ResearchExportDialog } from '@/components/research/research-export-dialog';
import { Bookmark, Search, RefreshCw, Layers, Compass, Download, Plus, Filter, ArrowUpDown } from 'lucide-react';

export default function ResearchLibraryPage() {
  const [documents, setDocuments] = useState<SavedResearchDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'BOOKMARKED' | 'WITH_NOTES' | 'WITH_MAP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'sources'>('newest');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLibraryDocuments = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/research/saved?limit=50', {
        method: 'GET',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load research library.');
      }

      setDocuments(json.data || []);
    } catch (err: any) {
      console.error('[RESEARCH LIBRARY PAGE] Error loading documents:', err);
      setErrorMsg(err.message || 'Failed to load research library.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryDocuments();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteDocument = async (id: string) => {
    const res = await fetch(`/api/research/saved/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete document.');
    }

    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  // Filter & Sort Documents
  const processedDocuments = useMemo(() => {
    let list = [...documents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) || d.query.toLowerCase().includes(q)
      );
    }

    if (filterMode === 'WITH_NOTES') {
      list = list.filter((d) => Boolean(d.annotationCount && d.annotationCount > 0));
    } else if (filterMode === 'WITH_MAP') {
      list = list.filter((d) => Boolean(d.learningPathId || d.learningStatus));
    }

    if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'sources') {
      list.sort((a, b) => (b.brief?.citations?.length || 0) - (a.brief?.citations?.length || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [documents, searchQuery, filterMode, sortBy]);

  return (
    <div className="flex-1 w-full min-h-screen p-6 md:p-8 space-y-6 bg-[var(--cyra-bg)] text-[var(--cyra-text)] relative transition-colors duration-200 font-sans">
      
      {/* ── HEADER SECTION ─────────────────────────────────────────── */}
      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#DCEEFF] text-[#286B91] border border-[#C5DFF2]">
            <Bookmark className="w-3.5 h-3.5 text-[#286B91]" />
            <span>RESEARCH ARCHIVE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#172033] font-sans mt-1">
            RESEARCH LIBRARY
          </h1>
          <p className="text-xs text-[#60758A] font-sans">
            Your collected intelligence archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/research/literature"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#C5D2E0] text-[#286B91] hover:bg-[#F0F5FA] font-sans text-xs font-bold transition-all"
          >
            <Layers className="w-4 h-4 text-[#286B91]" />
            <span>LITERATURE LAB</span>
          </Link>

          <Link
            href="/research"
            className="os-button-primary py-2 px-4"
          >
            <Plus className="w-4 h-4" />
            <span>+ NEW RESEARCH</span>
          </Link>
        </div>
      </div>

      {/* ── CONTROLS: SEARCH, FILTERS & SORT ───────────────────────── */}
      {!isLoading && !errorMsg && documents.length > 0 && (
        <div className="w-full max-w-6xl mx-auto">
          <div className="bg-[#FFFFFF] border border-[#D9E2EC] rounded-2xl p-4 shadow-[0_4px_18px_rgba(40,70,100,0.05)] flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
            {/* Search Input */}
            <div className="flex items-center gap-2.5 bg-[#FFFFFF] border border-[#C5D2E0] focus-within:border-[#149FC4] rounded-xl px-3.5 py-2 w-full md:w-80 transition-all">
              <Search className="w-4 h-4 text-[#60758A]" />
              <input
                type="text"
                placeholder="Search collected research..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-[#172033] placeholder-[#718198] focus:outline-none w-full font-sans"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F0F5FA] border border-[#D9E2EC]">
              {[
                { id: 'ALL', label: `ALL (${documents.length})` },
                { id: 'WITH_NOTES', label: `WITH NOTES (${documents.filter((d) => d.annotationCount && d.annotationCount > 0).length})` },
                { id: 'WITH_MAP', label: 'WITH MAP' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-[#DCEEFF] text-[#286B91] border border-[#C5DFF2] shadow-xs'
                      : 'text-[#60758A] hover:text-[#172033]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown & Count */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#718198] uppercase">
                {processedDocuments.length} BRIEFS
              </span>

              <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#C5D2E0] rounded-xl px-3 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#60758A]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-[#42546A] text-xs focus:outline-none cursor-pointer font-mono"
                >
                  <option value="newest">SORT: NEWEST</option>
                  <option value="title">SORT: TITLE</option>
                  <option value="sources">SORT: MOST SOURCES</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING SKELETON STATE ──────────────────────────────────── */}
      {isLoading && (
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#D9E2EC] space-y-3">
              <div className="h-4 w-24 bg-[#F0F5FA] rounded" />
              <div className="h-5 w-3/4 bg-[#F0F5FA] rounded" />
              <div className="h-3 w-1/2 bg-[#F0F5FA] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── ERROR STATE ─────────────────────────────────────────────── */}
      {errorMsg && !isLoading && (
        <div className="w-full max-w-xl mx-auto p-6 rounded-2xl bg-rose-50 border border-[#D45D6B] text-center space-y-3">
          <p className="text-xs text-[#D45D6B] font-mono">{errorMsg}</p>
          <button onClick={fetchLibraryDocuments} className="os-button-primary">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
      {!isLoading && !errorMsg && documents.length === 0 && (
        <div className="w-full max-w-xl mx-auto p-10 rounded-2xl bg-[#FFFFFF] border border-[#D9E2EC] text-center space-y-4 shadow-xs">
          <Layers className="w-10 h-10 text-[#718198] mx-auto opacity-50" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#172033] font-mono uppercase">Your research archive is empty.</h3>
            <p className="text-xs text-[#60758A] leading-relaxed font-sans">
              Synthesize findings across ArXiv and academic literature to collect research briefs.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/research" className="os-button-primary">
              <Plus className="w-4 h-4" />
              <span>START NEW RESEARCH</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── LIBRARY GRID VIEW (3 COLUMNS, 24px GAP) ────────────────── */}
      {!isLoading && !errorMsg && (
        <div className="w-full max-w-6xl mx-auto">
          <ResearchLibraryGrid
            documents={processedDocuments}
            onDeleteDocument={handleDeleteDocument}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </div>
      )}

      {/* ── FLOATING SELECTION TOOLBAR FOR BULK ACTION ─────────────── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-[#FFFFFF] border border-[#149FC4] shadow-2xl flex items-center justify-between gap-4 font-mono text-xs max-w-xl w-[90vw] flex-wrap">
          <ResearchExportDialog
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            documentType="bulk_citations"
            documentIds={selectedIds}
            title={`${selectedIds.length} Research Briefs`}
          />
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#149FC4]">{selectedIds.length} BRIEFS SELECTED</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportOpen(true)}
              className="os-button-primary py-1.5 px-3 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT SELECTED</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[#718198] hover:text-[#172033] text-xs font-mono underline cursor-pointer"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
