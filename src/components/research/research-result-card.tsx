'use client';

import React, { useState } from 'react';
import { ResearchSource } from '@/lib/research/types';
import { ResearchSourceBadge } from './research-source-badge';
import { ExternalLink, Calendar, Users, ChevronDown, ChevronUp, CheckCircle2, Globe, FileText } from 'lucide-react';

interface ResearchResultCardProps {
  result: ResearchSource;
}

export const ResearchResultCard: React.FC<ResearchResultCardProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const authorText = result.authors && result.authors.length > 0
    ? result.authors.slice(0, 3).join(', ') + (result.authors.length > 3 ? ' et al.' : '')
    : null;

  return (
    <article className="group p-5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-200 flex flex-col gap-3 text-left">
      {/* Top Row: Source Badge & Metadata Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ResearchSourceBadge
          type={result.sourceType}
          evidenceLevel={result.evidenceLevel}
          sourceName={result.source}
        />

        {result.arxivId && (
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            arXiv:{result.arxivId}
          </span>
        )}
      </div>

      {/* Paper Title */}
      <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors leading-snug">
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="focus:outline-none hover:underline"
        >
          {result.title}
        </a>
      </h3>

      {/* Authors & Publication Date Line */}
      {(authorText || result.publishedAt) && (
        <div className="flex items-center gap-3 text-xs font-sans text-[var(--text-secondary)] flex-wrap">
          {authorText && (
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
              <span>{authorText}</span>
            </div>
          )}

          {authorText && result.publishedAt && <span className="text-[var(--text-muted)]">·</span>}

          {result.publishedAt && (
            <div className="flex items-center gap-1 text-[var(--text-muted)] font-mono text-[11px]">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{result.publishedAt}</span>
            </div>
          )}
        </div>
      )}

      {/* Abstract / Description snippet */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 font-sans">
        {result.description}
      </p>

      {/* Bottom Footer Bar: Why Tags, Expandable Toggle & Open Source Link */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        {/* Subtle "Why this source?" Tags (Max 1-2) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {result.whySourceReasons && result.whySourceReasons.map((reason, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400 flex-shrink-0" />
              <span>{reason}</span>
            </span>
          ))}
        </div>

        {/* Action Controls: Details Toggle & Open Source Button */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] text-xs font-mono transition-all"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide paper details' : 'View paper details'}
          >
            <span>{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] hover:opacity-90 text-white font-medium text-xs transition-all flex-shrink-0"
            aria-label={`Open original source for ${result.title} in a new tab`}
          >
            <span>Open Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Lightweight Expandable Details Interaction */}
      {isExpanded && (
        <div className="mt-2 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] space-y-3 text-xs text-left animate-fadeIn">
          <div className="space-y-1">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              Full Abstract / Literature Summary
            </h4>
            <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-sans">
              {result.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)]">
            <div>
              <span className="text-[var(--text-muted)]">Domain:</span> {result.domain}
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Evidence Level:</span> {result.evidenceLevel.toUpperCase()}
            </div>
            {result.arxivId && (
              <div>
                <span className="text-[var(--text-muted)]">ArXiv Reference:</span> {result.arxivId}
              </div>
            )}
            {result.categories && result.categories.length > 0 && (
              <div>
                <span className="text-[var(--text-muted)]">Categories:</span> {result.categories.join(', ')}
              </div>
            )}
          </div>

          <div className="pt-1">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-cyan-400 hover:underline break-all inline-flex items-center gap-1"
            >
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span>{result.url}</span>
            </a>
          </div>
        </div>
      )}
    </article>
  );
};

export default ResearchResultCard;
