'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Calendar, 
  BookOpen, 
  GitFork, 
  Sparkles, 
  Download, 
  Trash2, 
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import ResearchExportDialog from '@/components/research/research-export-dialog';
import ResearchAnnotationPanel from '@/components/research/research-annotation-panel';
import ResearchKnowledgeMapModal from '@/components/research/research-knowledge-map-modal';

export interface ResearchLibraryDoc {
  id: string;
  title: string;
  topic?: string;
  intent?: string;
  created_at?: string;
  updated_at?: string;
  brief?: any;
  sources_count?: number;
  annotation_count?: number;
  map_status?: 'none' | 'pending' | 'approved' | 'rejected';
  knowledge_map_id?: string;
}

interface ResearchLibraryCardProps {
  doc: ResearchLibraryDoc;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function ResearchLibraryCard({
  doc,
  onDelete,
  onRefresh,
  isSelected = false,
  onToggleSelect,
}: ResearchLibraryCardProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(false);
  const [isKnowledgeMapOpen, setIsKnowledgeMapOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sourcesCount = doc.sources_count || doc.brief?.sources?.length || 0;
  const annotationCount = doc.annotation_count || 0;
  const formattedDate = doc.created_at
    ? new Date(doc.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(`Delete "${doc.title}" from research library?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(doc.id);
    } catch (err) {
      console.error('Delete document failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderMapStatusBadge = () => {
    if (doc.map_status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#218A69] bg-[#DDF6EC] border border-[#BDEBD9] px-2.5 py-0.5 rounded-lg">
          <CheckCircle2 className="w-3 h-3 text-[#218A69]" />
          <span>MAP APPROVED</span>
        </span>
      );
    }
    if (doc.map_status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#C4871B] bg-[#FFF3E8] border border-[#FCD8B8] px-2.5 py-0.5 rounded-lg">
          <Clock className="w-3 h-3 text-[#C4871B] animate-pulse" />
          <span>PENDING MAP</span>
        </span>
      );
    }
    if (doc.map_status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#D45D6B] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D45D6B]" />
          <span>REJECTED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#718198] bg-[#F0F5FA] border border-[#D9E2EC] px-2.5 py-0.5 rounded-lg">
        <span className="w-1.5 h-1.5 rounded-full border border-[#718198]" />
        <span>NO MAP</span>
      </span>
    );
  };

  const intentLabel = doc.intent ? doc.intent.replace('_', ' ') : 'GENERAL';

  return (
    <div className={`group p-6 rounded-2xl bg-[#FFFFFF] border transition-all duration-150 flex flex-col justify-between gap-5 text-left shadow-[0_4px_18px_rgba(40,70,100,0.05)] hover:-translate-y-0.5 font-sans ${
      isSelected ? 'border-[#149FC4] bg-[#EAF4FB]' : 'border-[#D9E2EC] hover:border-[#C5D2E0]'
    }`}>
      {/* Modals & Dialogs */}
      <ResearchExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentType="research_brief"
        documentId={doc.id}
        title={doc.title}
        documentData={doc.brief}
      />

      <ResearchAnnotationPanel
        isOpen={isAnnotationPanelOpen}
        onClose={() => setIsAnnotationPanelOpen(false)}
        researchDocumentId={doc.id}
        documentTitle={doc.title}
      />

      <ResearchKnowledgeMapModal
        open={isKnowledgeMapOpen}
        onOpenChange={setIsKnowledgeMapOpen}
        researchDocumentId={doc.id}
        researchTitle={doc.title}
      />

      {/* Top Header Row: Select Checkbox & Research Type Badges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <button
                type="button"
                onClick={() => onToggleSelect(doc.id)}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#149FC4] text-white border-[#149FC4]'
                    : 'bg-[#F0F5FA] text-[#718198] border-[#D9E2EC] hover:border-[#C5D2E0]'
                }`}
              >
                {isSelected ? '✓ SELECTED' : '+ SELECT'}
              </button>
            )}

            {/* General / Intent Badge */}
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-[#286B91] bg-[#DCEEFF] border border-[#C5DFF2] px-2.5 py-0.5 rounded-lg">
              {intentLabel}
            </span>

            {/* Topic / Definition Badge */}
            {doc.topic && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-[#6259B4] bg-[#EAE7FF] border border-[#D9D5FB] px-2 py-0.5 rounded-lg">
                {doc.topic.length > 16 ? `${doc.topic.substring(0, 16)}...` : doc.topic}
              </span>
            )}
          </div>

          {renderMapStatusBadge()}
        </div>

        {/* Title */}
        <Link href={`/research/library/${doc.id}`} className="block group-hover:text-[#149FC4] transition-colors">
          <h3 className="text-base font-extrabold text-[#172033] leading-snug line-clamp-2 font-sans">
            {doc.title}
          </h3>
        </Link>

        {/* Description / Summary excerpt */}
        <p className="text-xs text-[#60758A] line-clamp-2 leading-relaxed font-sans">
          {doc.brief?.executiveSummary || 'Synthesized academic literature brief with citation evidence.'}
        </p>

        {/* Metadata Details Row */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#718198] pt-2 border-t border-[#D9E2EC]">
          <span className="flex items-center gap-1 text-[#718198]">
            <Calendar className="w-3 h-3 text-[#718198]" />
            {formattedDate}
          </span>

          <span>•</span>

          <span className="flex items-center gap-1 text-[#286B91] font-bold">
            <FileText className="w-3 h-3 text-[#286B91]" />
            {sourcesCount} {sourcesCount === 1 ? 'Source' : 'Sources'}
          </span>

          {annotationCount > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#6259B4] font-bold">
                <MessageSquare className="w-3 h-3 text-[#6259B4]" />
                {annotationCount} {annotationCount === 1 ? 'Note' : 'Notes'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsKnowledgeMapOpen(true)}
            className="p-1.5 rounded-lg text-[#7770D8] hover:bg-[#F0F5FA] transition-colors cursor-pointer border border-transparent hover:border-[#D9E2EC]"
            title="Open Neural Knowledge Map"
          >
            <GitFork className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsAnnotationPanelOpen(true)}
            className="p-1.5 rounded-lg text-[#60758A] hover:bg-[#F0F5FA] transition-colors cursor-pointer border border-transparent hover:border-[#D9E2EC]"
            title="Open Personal Notes"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="p-1.5 rounded-lg text-[#60758A] hover:bg-[#F0F5FA] transition-colors cursor-pointer border border-transparent hover:border-[#D9E2EC]"
            title="Export Document"
          >
            <Download className="w-4 h-4" />
          </button>

          {onDelete && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-[#718198] hover:text-[#D45D6B] hover:bg-rose-50 transition-colors cursor-pointer border border-transparent"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <Link
          href={`/research/library/${doc.id}`}
          className="inline-flex items-center gap-1 py-1 px-3 rounded-lg bg-[#FFFFFF] border border-[#C5D2E0] hover:border-[#149FC4] text-[#149FC4] hover:bg-[#EAF4FB] text-[10px] uppercase font-bold transition-all"
        >
          <span>READ BRIEF</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default ResearchLibraryCard;
