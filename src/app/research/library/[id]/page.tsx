'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SavedResearchDocument, ResearchBrief, SavedResearchLearningStatus } from '@/lib/research/types';
import { ResearchBriefComponent } from '@/components/research/research-brief';
import { ResearchLearningBanner } from '@/components/research/research-learning-banner';
import { ArrowLeft, GraduationCap, RefreshCw, BookmarkCheck, Trash2, AlertCircle } from 'lucide-react';

export default function SavedResearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [document, setDocument] = useState<SavedResearchDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Adaptive Next Action State
  const [nextBestAction, setNextBestAction] = useState<any>(null);
  const [isNextActionLoading, setIsNextActionLoading] = useState(false);

  // Path Creation State
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [creationProgressStep, setCreationProgressStep] = useState<string | null>(null);
  const [existingPathId, setExistingPathId] = useState<string | null>(null);

  // Delete State
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocument = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/research/saved/${resolvedParams.id}`);
      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Saved research document not found.');
      }

      const doc: SavedResearchDocument = json.data;
      setDocument(doc);

      if (doc.learningPathId) {
        setExistingPathId(doc.learningPathId);

        // Fetch current adaptive next best action (non-blocking for Research Brief)
        fetchNextBestAction(doc.learningPathId);
      }
    } catch (err: any) {
      console.error('[SAVED RESEARCH DETAIL PAGE] Error:', err);
      setErrorMsg(err.message || 'Saved research document not found.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNextBestAction = async (pathId: string) => {
    setIsNextActionLoading(true);
    try {
      const res = await fetch(`/api/adaptive/next-action?learningPathId=${pathId}`);
      const json = await res.json();

      if (res.ok && json.success && json.data?.nextBestAction) {
        setNextBestAction(json.data.nextBestAction);
      }
    } catch (err) {
      console.warn('[SAVED RESEARCH DETAIL PAGE] Non-critical next-action fetch warning:', err);
    } finally {
      setIsNextActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [resolvedParams.id]);

  const handleCreateLearningPath = async (brief: ResearchBrief) => {
    if (!brief || isCreatingPath || !document) return;

    setIsCreatingPath(true);
    setCreationProgressStep('Analyzing research findings... Structuring concepts...');

    try {
      setCreationProgressStep('Building lessons and curriculum roadmap...');
      const res = await fetch('/api/research/create-learning-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: document.query,
          brief,
          documentId: document.id,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create learning path from research brief.');
      }

      // If duplicate course was detected
      if (json.existingPath && json.learningPathId) {
        setExistingPathId(json.learningPathId);
        setIsCreatingPath(false);
        return;
      }

      setCreationProgressStep('Preparing your adaptive path...');
      if (json.learningPathId) {
        router.push(`/learn/${json.learningPathId}`);
      }
    } catch (err: any) {
      console.error('[SAVED RESEARCH DETAIL PAGE] Path creation error:', err);
      setErrorMsg(err.message || 'Failed to create learning path.');
      setIsCreatingPath(false);
    } finally {
      setCreationProgressStep(null);
    }
  };

  const handleDeleteDocument = async () => {
    if (!document) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/research/saved/${document.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete research document.');
      }

      router.push('/research/library');
    } catch (err: any) {
      console.error('[SAVED RESEARCH DETAIL PAGE] Delete error:', err);
      setErrorMsg(err.message || 'Failed to delete research document.');
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-6 bg-[var(--bg)] text-[var(--text-primary)] text-left animate-pulse">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <div className="h-4 w-28 bg-[var(--bg-elevated)] rounded" />
          <div className="h-4 w-20 bg-[var(--bg-elevated)] rounded" />
        </div>
        <div className="w-full max-w-4xl mx-auto p-8 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-4">
          <div className="h-6 w-3/4 bg-[var(--bg-elevated)] rounded" />
          <div className="h-4 w-full bg-[var(--bg-elevated)] rounded" />
          <div className="h-4 w-5/6 bg-[var(--bg-elevated)] rounded" />
        </div>
      </div>
    );
  }

  if (errorMsg || !document) {
    return (
      <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-6 bg-[var(--bg)] text-[var(--text-primary)] text-left">
        <div className="w-full max-w-xl mx-auto p-8 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">Research Document Not Found</h2>
          <p className="text-xs text-[var(--text-secondary)] font-mono">{errorMsg}</p>
          <div className="pt-2">
            <Link
              href="/research/library"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Library</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex-1 w-full min-h-screen p-4 sm:p-6 md:p-8 space-y-6 bg-[var(--bg)] text-[var(--text-primary)] text-left">
      {/* Navigation & Status Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/research/library"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>SAVED TO LIBRARY · {formattedDate}</span>
          </span>

          {document.learningPathId && (
            <Link
              href={`/learn/${document.learningPathId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent)] text-white font-medium text-xs hover:opacity-90 transition-all"
            >
              <GraduationCap className="w-4 h-4" />
              <span>OPEN LEARNING PATH</span>
            </Link>
          )}

          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
              title="Delete this document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs font-mono bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
              <span className="text-red-400 font-bold">Delete?</span>
              <button
                onClick={handleDeleteDocument}
                disabled={isDeleting}
                className="text-red-400 hover:underline font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Yes'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="text-[var(--text-muted)] hover:underline"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Render Saved Research Brief Component */}
      <ResearchBriefComponent
        brief={document.brief}
        query={document.query}
        intent={document.intent}
        documentId={document.id}
        onCreateLearningPath={handleCreateLearningPath}
        isCreatingPath={isCreatingPath}
        creationProgressStep={creationProgressStep}
        existingPathId={existingPathId}
        onNavigateToExistingPath={(pathId) => router.push(`/learn/${pathId}`)}
        isSavedInLibrary={true}
      />

      {/* Render Linked Learning Path Intelligence Banner if Available */}
      {(document.learningStatus || document.learningPathId) && (
        <ResearchLearningBanner
          learningStatus={
            document.learningStatus || {
              learningPathId: document.learningPathId!,
              learningPathTitle: document.title,
              totalLessons: 0,
              completedLessons: 0,
              progressPercent: 0,
              hasDecay: false,
              lastActivityAt: document.updatedAt,
            }
          }
          nextBestAction={nextBestAction}
        />
      )}
    </div>
  );
}
