'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Sparkles, BookOpen, Compass, Bookmark } from 'lucide-react';

interface ResearchSearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  hasSearched?: boolean;
}

const SUGGESTIONS = [
  { label: 'TCP Congestion Control', query: 'TCP Congestion Control Algorithms', icon: Sparkles },
  { label: 'Quantum Computing', query: 'Quantum Computing Architecture', icon: Sparkles },
  { label: 'Transformers & Attention', query: 'Transformer Attention Mechanism', icon: Sparkles },
  { label: 'Virtual Memory Paging', query: 'Virtual Memory Paging Algorithms', icon: Sparkles },
];

export function ResearchSearch({ onSearch, isLoading = false }: ResearchSearchProps) {
  const [queryInput, setQueryInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isLoading) return;
    setHasSearched(true);
    onSearch(queryInput.trim());
  };

  const handleSuggestionClick = (query: string) => {
    setQueryInput(query);
    setHasSearched(true);
    onSearch(query);
  };

  return (
    <div className="w-full max-w-[800px] mx-auto text-center font-sans space-y-0">
      
      {/* ── TOP UTILITY NAVIGATION ROW ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        {/* Small Label Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-extrabold uppercase tracking-wider bg-[#DCEEFF] text-[#286B91] border border-[#C5DFF2]">
          <BookOpen className="w-3.5 h-3.5 text-[#286B91]" />
          <span>CYRA ACADEMIC RESEARCH ENGINE</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Link
            href="/research/intelligence"
            className="os-button-secondary py-1 px-3 bg-[#FFFFFF] border border-[#C5D2E0] text-[#286B91] hover:bg-[#F0F5FA]"
          >
            <Compass className="w-3.5 h-3.5 text-[#149FC4]" />
            <span>INTELLIGENCE</span>
          </Link>

          <Link
            href="/research/library"
            className="os-button-secondary py-1 px-3 bg-[#FFFFFF] border border-[#C5D2E0] text-[#286B91] hover:bg-[#F0F5FA]"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#7770D8]" />
            <span>SAVED BRIEFS</span>
          </Link>
        </div>
      </div>

      {/* ── HERO TITLE & SUBTITLE ────────────────────────────────────── */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#172033] mb-3 font-sans leading-tight">
        MULTI-PROVIDER <span className="text-[#149FC4]">RESEARCH WORKSTATION</span>
      </h1>

      <p className="text-xs sm:text-sm text-[#60758A] max-w-xl mx-auto leading-relaxed mb-8 font-sans">
        Synthesize findings across ArXiv, CrossRef, and Open Access publications with AI knowledge mapping.
      </p>

      {/* ── SEARCH INPUT FORM ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="w-full relative mb-6">
        <div className="flex items-center gap-3 bg-[#FFFFFF] border border-[#C5D2E0] focus-within:border-[#149FC4] rounded-2xl h-16 px-4 transition-all shadow-[0_6px_20px_rgba(40,70,100,0.07)]">
          <Search className="w-5 h-5 text-[#60758A] flex-shrink-0" />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            disabled={isLoading}
            placeholder="Search arXiv papers, academic publications, or technical concepts..."
            className="flex-1 bg-transparent text-sm text-[#172033] placeholder-[#718198] focus:outline-none disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={!queryInput.trim() || isLoading}
            className="h-11 px-5 rounded-xl bg-[#149FC4] hover:bg-[#118AAA] text-white font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <span>{isLoading ? 'SEARCHING...' : 'EXECUTE SEARCH'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* ── PASTEL SUGGESTED DISCOVERIES ────────────────────────────── */}
      {!hasSearched && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-[#60758A] mr-1">SUGGESTED DISCOVERIES:</span>
          {SUGGESTIONS.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(item.query)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EAF4FB] border border-[#D9E2EC] hover:border-[#B9DCEC] text-xs font-sans text-[#42546A] hover:text-[#286B91] transition-all cursor-pointer shadow-xs"
              >
                <IconComponent className="w-3.5 h-3.5 text-[#149FC4]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default ResearchSearch;
