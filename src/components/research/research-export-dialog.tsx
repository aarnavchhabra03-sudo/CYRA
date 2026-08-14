'use client';

import React, { useState } from 'react';
import {
  ResearchExportFormat,
  ResearchCitationStyle,
  ResearchExportDocumentType,
} from '@/lib/research/types';
import { formatCitation } from '@/lib/research/export';
import { Download, Copy, Check, X, FileText, Sparkles, Layers } from 'lucide-react';

interface ResearchExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: ResearchExportDocumentType;
  documentId?: string;
  documentIds?: string[];
  documentData?: any; // Fallback data for transient review/brief
  title?: string;
}

export const ResearchExportDialog: React.FC<ResearchExportDialogProps> = ({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentIds,
  documentData,
  title = 'CYRA Research Investigation',
}) => {
  const [format, setFormat] = useState<ResearchExportFormat>('markdown');
  const [citationStyle, setCitationStyle] = useState<ResearchCitationStyle>('apa');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/research/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          documentId,
          documentIds,
          literatureReview: documentData,
          format,
          citationStyle,
          includeNotes,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to generate export file.');
      }

      const blob = await res.blob();
      const contentDisp = res.headers.get('Content-Disposition');
      let filename = `cyra-export.${format}`;
      if (contentDisp && contentDisp.includes('filename=')) {
        const match = contentDisp.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[EXPORT DIALOG] Download error:', err);
      setErrorMsg(err.message || 'Failed to download export file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCitationStyle = (style: ResearchCitationStyle) => {
    const citations = documentData?.citations || documentData?.brief?.citations || [];
    if (citations.length === 0) {
      setErrorMsg('No citations available to copy.');
      return;
    }

    const formattedList = citations
      .map((c: any, idx: number) => `[${idx + 1}] ${formatCitation(c, style)}`)
      .join('\n\n');

    navigator.clipboard.writeText(formattedList);
    setCopiedStyle(style);
    setTimeout(() => setCopiedStyle(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-left">
      <div className="w-full max-w-lg rounded-xl bg-[var(--card)] border border-[var(--border)] p-6 space-y-6 shadow-2xl relative text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
              EXPORT RESEARCH WORKSTATION
            </span>
            <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug truncate max-w-md">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Format Selector */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase block">
            Select Export Format
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              { id: 'markdown', label: 'Markdown (.md)', desc: 'Clean GitHub markdown text' },
              { id: 'pdf', label: 'PDF Report (.pdf)', desc: 'Printable academic layout' },
              { id: 'bibtex', label: 'BibTeX (.bib)', desc: 'For LaTeX & reference managers' },
              { id: 'ris', label: 'RIS (.ris)', desc: 'For EndNote, Zotero & Mendeley' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id as any)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  format === item.id
                    ? 'bg-cyan-500/10 border-cyan-400 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="font-bold text-xs">{item.label}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Citation Style Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase">
              Citation Style
            </span>
            {copiedStyle && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                <Check className="w-3 h-3" />
                <span>Citation copied ✓</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            {(['apa', 'mla', 'chicago', 'plain'] as ResearchCitationStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setCitationStyle(style)}
                className={`px-3 py-2 rounded-lg border uppercase text-center font-bold text-xs transition-all ${
                  citationStyle === style
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400'
                    : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-secondary)]'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Include Personal Notes Option (for PDF & Markdown) */}
        {(format === 'markdown' || format === 'pdf') && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-mono">
            <input
              type="checkbox"
              id="includeNotesCheckbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] accent-cyan-400 cursor-pointer"
            />
            <label htmlFor="includeNotesCheckbox" className="text-[var(--text-primary)] font-bold cursor-pointer">
              INCLUDE MY PERSONAL RESEARCH NOTES
            </label>
          </div>
        )}

        {/* Quick Copy Buttons for Citations */}
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            QUICK CITATION COPY
          </span>
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {(['apa', 'mla', 'chicago'] as ResearchCitationStyle[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleCopyCitationStyle(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-primary)] text-xs transition-all"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                <span className="uppercase">Copy {s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--border)] font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white font-bold transition-all ml-auto"
          >
            {isExporting ? (
              <span>Exporting...</span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="uppercase">DOWNLOAD {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchExportDialog;
