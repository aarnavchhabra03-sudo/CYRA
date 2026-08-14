'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ResearchBrief } from '@/lib/research/types';
import { ResearchSaveButton } from './research-save-button';
import { ResearchExportDialog } from './research-export-dialog';
import { ResearchAnnotationPanel } from './research-annotation-panel';
import { ResearchKnowledgeMapModal } from './research-knowledge-map-modal';
import {
  FileText,
  CheckCircle2,
  GitCompare,
  Lightbulb,
  BookOpen,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Sparkles,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Download,
  StickyNote,
  MessageSquarePlus,
  GitFork,
  ArrowLeft,
  Calendar,
  Database,
  Brain,
  Layers,
  Compass
} from 'lucide-react';

interface ResearchBriefProps {
  brief: ResearchBrief;
  query?: string;
  intent?: string;
  documentId?: string;
  onSelectCitation?: (sourceId: string) => void;
  onCreateLearningPath?: (brief: ResearchBrief) => void;
  isCreatingPath?: boolean;
  creationProgressStep?: string | null;
  existingPathId?: string | null;
  onNavigateToExistingPath?: (pathId: string) => void;
  isSavedInLibrary?: boolean;
}

export const ResearchBriefComponent: React.FC<ResearchBriefProps> = ({
  brief,
  query = '',
  intent = 'general',
  documentId,
  onSelectCitation,
  onCreateLearningPath,
  isCreatingPath = false,
  creationProgressStep = null,
  existingPathId = null,
  onNavigateToExistingPath,
  isSavedInLibrary = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(false);
  const [isKnowledgeMapOpen, setIsKnowledgeMapOpen] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [activeCitationForNote, setActiveCitationForNote] = useState<any>(null);
  const [selectedTextForNote, setSelectedTextForNote] = useState<string | null>(null);

  // Helper map for source ID to citation index
  const sourceIdToIndexMap = new Map<string, number>();
  brief.citations.forEach((c) => sourceIdToIndexMap.set(c.sourceId, c.index));

  const renderCitationBadges = (citationIds: string[]) => {
    if (!citationIds || citationIds.length === 0) return null;

    return (
      <span className="inline-flex items-center gap-1 ml-1.5 align-middle">
        {citationIds.map((id) => {
          const index = sourceIdToIndexMap.get(id);
          if (!index) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectCitation && onSelectCitation(id)}
              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all cursor-pointer"
              title="Jump to citation source"
            >
              [{index}]
            </button>
          );
        })}
      </span>
    );
  };

  const effectiveDocId = documentId || (brief as any).id;
  const citationCount = brief.citations?.length || 0;
  const conceptCount = brief.keyFindings?.length || 0;
  const formattedDate = new Date(brief.generatedAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      {/* Knowledge Map Modal */}
      {effectiveDocId && (
        <ResearchKnowledgeMapModal
          open={isKnowledgeMapOpen}
          onOpenChange={setIsKnowledgeMapOpen}
          researchDocumentId={effectiveDocId}
          researchTitle={brief.title}
        />
      )}

      {/* Export Dialog */}
      <ResearchExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentType="research_brief"
        documentId={effectiveDocId}
        documentData={{ title: brief.title, query, intent, brief }}
        title={brief.title}
      />

      {/* Annotation Panel */}
      {effectiveDocId && (
        <ResearchAnnotationPanel
          isOpen={isAnnotationPanelOpen}
          onClose={() => setIsAnnotationPanelOpen(false)}
          researchDocumentId={effectiveDocId}
          documentTitle={brief.title}
          initialCitation={activeCitationForNote}
          initialSelectedText={selectedTextForNote}
          onAnnotationCountChange={(cnt) => setAnnotationCount(cnt)}
        />
      )}

      {/* Duplicate Path Alert Banner */}
      {existingPathId && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-400 font-mono flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>SIMILAR LEARNING PATH FOUND — CYRA has an active course for this topic.</span>
          </div>
          {onNavigateToExistingPath && (
            <button
              onClick={() => onNavigateToExistingPath(existingPathId)}
              className="os-button-primary py-1 px-3 text-[10px]"
            >
              <span>Continue Existing Path &rarr;</span>
            </button>
          )}
        </div>
      )}

      {/* ── WORKSPACE TOP HEADER ────────────────────────────────────────── */}
      <div className="space-y-4 pb-4 border-b border-[#202938]">
        <Link
          href="/research/library"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>&larr; Research Library</span>
        </Link>

        <div className="space-y-2">
          <div className="os-badge os-badge-cyan">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>RESEARCH BRIEF</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {brief.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-1">
            <span className="os-badge os-badge-indigo">
              {intent ? intent.replace('_', ' ') : 'RESEARCH'}
            </span>

            <span className="text-slate-600">•</span>

            <span className="flex items-center gap-1 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formattedDate}
            </span>

            <span className="text-slate-600">•</span>

            <span className="flex items-center gap-1 text-indigo-300">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              {citationCount} Sources
            </span>

            <span className="text-slate-600">•</span>

            <span className="flex items-center gap-1 text-cyan-300">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              {conceptCount} Mapped Concepts
            </span>
          </div>
        </div>
      </div>

      {/* ── ACTION TOOLBAR BAR ─────────────────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-[var(--cyra-panel)] border border-[var(--cyra-border)] flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {effectiveDocId && (
            <button
              onClick={() => setIsKnowledgeMapOpen(true)}
              className="os-button-secondary py-1.5 px-3"
            >
              <GitFork className="w-3.5 h-3.5 text-[var(--cyra-cyan)]" />
              <span>KNOWLEDGE MAP</span>
            </button>
          )}

          <button
            onClick={() => setIsExportOpen(true)}
            className="os-button-secondary py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5 text-[var(--cyra-cyan)]" />
            <span>EXPORT</span>
          </button>

          {effectiveDocId && (
            <button
              onClick={() => {
                setActiveCitationForNote(null);
                setSelectedTextForNote(null);
                setIsAnnotationPanelOpen(true);
              }}
              className="os-button-secondary py-1.5 px-3"
            >
              <StickyNote className="w-3.5 h-3.5 text-[var(--cyra-cyan)]" />
              <span>NOTES {annotationCount > 0 ? `(${annotationCount})` : ''}</span>
            </button>
          )}

          {query && (
            <ResearchSaveButton
              query={query}
              brief={brief}
              intent={intent}
              initialSaved={isSavedInLibrary}
            />
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {onCreateLearningPath && !isCreatingPath && (
            <button
              onClick={() => onCreateLearningPath(brief)}
              className="os-button-primary py-1.5 px-4"
            >
              <GraduationCap className="w-4 h-4" />
              <span>LEARN THIS WITH CYRA</span>
            </button>
          )}

          {isCreatingPath && (
            <div className="os-badge os-badge-cyan">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>BUILDING LEARNING PATH...</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[var(--cyra-text-secondary)] hover:text-[var(--cyra-text)] flex items-center gap-1 text-xs cursor-pointer"
          >
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isCreatingPath && (
        <div className="p-3 rounded-lg bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] text-xs font-mono text-[var(--cyra-cyan)] text-center animate-pulse">
          {creationProgressStep || 'Structuring concepts... Building curriculum...'}
        </div>
      )}

      {/* ── 2-COLUMN READING WORKSPACE GRID ────────────────────────────── */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">

          {/* LEFT / MAIN READING COLUMN (8 COLS) */}
          <main className="lg:col-span-8 space-y-8">

            {/* Executive Summary */}
            <div className="os-card p-6 space-y-3 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--cyra-text-muted)] block">
                EXECUTIVE SUMMARY
              </span>
              <p className="text-sm text-[var(--cyra-text)] leading-relaxed font-sans font-medium">
                {brief.executiveSummary}
              </p>
            </div>

            {/* Section 1: Key Findings */}
            {brief.keyFindings && brief.keyFindings.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Key Findings ({brief.keyFindings.length})</span>
                </h3>

                <div className="space-y-4">
                  {brief.keyFindings.map((finding, idx) => (
                    <div key={idx} className="os-card p-5 space-y-2">
                      <h4 className="text-sm font-bold text-white leading-snug">
                        <span className="text-cyan-400 font-mono mr-2">{String(idx + 1).padStart(2, '0')}.</span>
                        {finding.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {finding.explanation}
                        {renderCitationBadges(finding.citationIds)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Source Agreement & Differences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brief.sourceAgreement && brief.sourceAgreement.length > 0 && (
                <div className="os-card p-5 space-y-3 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cyra-green)] uppercase">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Source Consensus</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--cyra-text-secondary)] font-sans">
                    {brief.sourceAgreement.map((item, idx) => (
                      <li key={idx} className="leading-relaxed flex items-start gap-2">
                        <span className="text-[var(--cyra-green)] font-bold">•</span>
                        <span>
                          {item.statement}
                          {renderCitationBadges(item.citationIds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {brief.sourceDifferences && brief.sourceDifferences.length > 0 && (
                <div className="os-card p-5 space-y-3 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--cyra-amber)] uppercase">
                    <GitCompare className="w-4 h-4 flex-shrink-0" />
                    <span>Source Differences</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--cyra-text-secondary)] font-sans">
                    {brief.sourceDifferences.map((item, idx) => (
                      <li key={idx} className="leading-relaxed flex items-start gap-2">
                        <span className="text-[var(--cyra-amber)] font-bold">•</span>
                        <span>
                          {item.statement}
                          {renderCitationBadges(item.citationIds)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Section 3: Practical Takeaways */}
            {brief.practicalTakeaways && brief.practicalTakeaways.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--cyra-text)] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[var(--cyra-amber)]" />
                  <span>Practical Takeaways</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {brief.practicalTakeaways.map((takeaway, idx) => (
                    <div key={idx} className="os-card p-4 text-xs text-[var(--cyra-text-secondary)] leading-relaxed flex items-start gap-2 font-sans bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                      <span className="text-[var(--cyra-cyan)] font-mono font-bold flex-shrink-0">{idx + 1}.</span>
                      <span>{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* RIGHT / STICKY RESEARCH INTELLIGENCE SIDEBAR (4 COLS) */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            
            <div className="os-card p-5 space-y-5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
              <div className="flex items-center justify-between border-b border-[var(--cyra-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[var(--cyra-cyan)]" />
                  <span className="text-xs font-mono font-bold text-[var(--cyra-text)] uppercase">RESEARCH INTELLIGENCE</span>
                </div>
                <span className="os-badge os-badge-cyan">LIVE</span>
              </div>

              {/* 1. Key Findings Index */}
              {brief.keyFindings && brief.keyFindings.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--cyra-text-muted)] block">KEY FINDINGS</span>
                  <ul className="space-y-1.5 font-mono text-xs">
                    {brief.keyFindings.map((f, i) => (
                      <li key={i} className="text-[var(--cyra-text-secondary)] truncate hover:text-[var(--cyra-cyan)] transition-colors">
                        <span className="text-[var(--cyra-cyan)] font-bold mr-1">#{i + 1}</span> {f.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 2. Important Concepts */}
              {brief.suggestedLearningTopics && brief.suggestedLearningTopics.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--cyra-border)]">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--cyra-text-muted)] block">IMPORTANT CONCEPTS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.suggestedLearningTopics.map((topic, idx) => (
                      <span key={idx} className="os-badge os-badge-indigo">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Evidence & Sources Breakdown */}
              {brief.citations && brief.citations.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[var(--cyra-border)]">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--cyra-text-muted)] block">
                    EVIDENCE SOURCES ({brief.citations.length})
                  </span>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {brief.citations.map((citation) => (
                      <div key={citation.id} className="p-2.5 rounded-lg bg-[var(--cyra-card-soft)] border border-[var(--cyra-border)] space-y-1 text-xs font-mono">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[var(--cyra-cyan)]">[{citation.index}]</span>
                          <span className="text-[10px] text-[var(--cyra-text-muted)] uppercase">{citation.source}</span>
                        </div>
                        <p className="text-[var(--cyra-text)] font-sans text-xs line-clamp-2 leading-snug">{citation.title}</p>
                        
                        <div className="flex items-center justify-between pt-1">
                          {effectiveDocId && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCitationForNote({
                                  id: citation.id,
                                  title: citation.title,
                                  url: citation.url,
                                });
                                setSelectedTextForNote(null);
                                setIsAnnotationPanelOpen(true);
                              }}
                              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                            >
                              <MessageSquarePlus className="w-3 h-3" />
                              <span>+ NOTE</span>
                            </button>
                          )}

                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Related Research Quick Navigation */}
              <div className="pt-2 border-t border-[#202938] text-xs font-mono">
                <Link
                  href="/research/intelligence"
                  className="flex items-center justify-between text-cyan-400 hover:underline font-bold"
                >
                  <span>EXPLORE CONCEPT MATRIX</span>
                  <Compass className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          </aside>

        </div>
      )}
    </div>
  );
};

export default ResearchBriefComponent;
