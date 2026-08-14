'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResearchIntelligenceData } from '@/lib/research/types';
import { ResearchIntelligenceDashboard } from '@/components/research/research-intelligence-dashboard';
import { Compass, RefreshCw, AlertCircle } from 'lucide-react';

export default function ResearchIntelligencePage() {
  const [data, setData] = useState<ResearchIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchIntelligence = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/research/intelligence');
      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Failed to load Research Intelligence.');
      }

      setData(json.data);
    } catch (err: any) {
      console.error('[RESEARCH INTELLIGENCE PAGE] Error loading intelligence:', err);
      setErrorMsg(err.message || 'Failed to load Research Intelligence.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-8 bg-[var(--bg)] text-[var(--text-primary)] text-left animate-pulse">
        <div className="w-full max-w-6xl mx-auto space-y-3 pb-4 border-b border-[var(--border)]">
          <div className="h-4 w-36 bg-[var(--bg-elevated)] rounded" />
          <div className="h-7 w-64 bg-[var(--bg-elevated)] rounded" />
          <div className="h-4 w-96 bg-[var(--bg-elevated)] rounded" />
        </div>
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-4">
              <div className="h-4 w-24 bg-[var(--bg-elevated)] rounded" />
              <div className="h-5 w-3/4 bg-[var(--bg-elevated)] rounded" />
              <div className="h-12 w-full bg-[var(--bg-elevated)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-8 bg-[var(--bg)] text-[var(--text-primary)] text-left">
        <div className="w-full max-w-xl mx-auto p-8 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">Research Intelligence Error</h2>
          <p className="text-xs text-[var(--text-secondary)] font-mono">{errorMsg}</p>
          <div className="pt-2">
            <button
              onClick={fetchIntelligence}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-8 bg-[var(--bg)] text-[var(--text-primary)]">
      <ResearchIntelligenceDashboard data={data} />
    </div>
  );
}
