'use client';

import React, { useEffect, useState } from 'react';
import { KnowledgeGraphVisualization } from './knowledge-graph-visualization';
import {
  ResearchKnowledgeMap,
  ResearchKnowledgeNode,
  ResearchKnowledgeEdge,
} from '@/lib/research/types';
import {
  GitFork,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  Zap,
  BookOpen,
  Info,
  Clock,
  Sparkles,
  Database,
  Brain,
  Activity
} from 'lucide-react';

interface ResearchKnowledgeMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  researchDocumentId: string;
  researchTitle?: string;
}

export const ResearchKnowledgeMapModal: React.FC<ResearchKnowledgeMapModalProps> = ({
  open,
  onOpenChange,
  researchDocumentId,
  researchTitle,
}) => {
  const [mapData, setMapData] = useState<ResearchKnowledgeMap | null>(null);
  const [statusState, setStatusState] = useState<
    'loading' | 'no_map' | 'pending' | 'approved' | 'rejected' | 'success_approved' | 'success_rejected' | 'error'
  >('loading');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalPhase, setApprovalPhase] = useState<'idle' | 'analyzing' | 'merging' | 'updated'>('idle');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Hover state for Neural Node graph preview
  const [hoveredNode, setHoveredNode] = useState<ResearchKnowledgeNode | null>(null);

  // Selection states
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [edgeWarningMsg, setEdgeWarningMsg] = useState<string | null>(null);

  // Success stats
  const [approvedStats, setApprovedStats] = useState<{ nodes: number; edges: number }>({ nodes: 0, edges: 0 });

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Fetch map on open
  useEffect(() => {
    if (!open || !researchDocumentId) return;

    fetchKnowledgeMap();
  }, [open, researchDocumentId]);

  const fetchKnowledgeMap = async () => {
    setStatusState('loading');
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/research/knowledge-map?researchDocumentId=${researchDocumentId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to retrieve knowledge map');
      }

      if (!json.data) {
        setStatusState('no_map');
        setMapData(null);
        return;
      }

      const map: ResearchKnowledgeMap = json.data;
      setMapData(map);

      if (map.status === 'pending') {
        setStatusState('pending');
        const initNodes = new Set(map.nodes.map((n) => n.id));
        setSelectedNodeIds(initNodes);

        const initEdges = new Set(
          map.edges
            .filter((e) => initNodes.has(e.sourceNodeId) && initNodes.has(e.targetNodeId))
            .map((e) => e.id)
        );
        setSelectedEdgeIds(initEdges);
      } else if (map.status === 'approved') {
        setStatusState('approved');
      } else if (map.status === 'rejected') {
        setStatusState('rejected');
      }
    } catch (err: any) {
      console.error('[KNOWLEDGE MAP MODAL] Fetch error:', err);
      setErrorMsg(err.message || 'Failed to load research knowledge map');
      setStatusState('error');
    }
  };

  const handleGenerateMap = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/research/knowledge-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchDocumentId }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Knowledge map generation failed');
      }

      const newMap: ResearchKnowledgeMap = json.data;
      setMapData(newMap);
      setStatusState('pending');

      const initNodes = new Set(newMap.nodes.map((n) => n.id));
      setSelectedNodeIds(initNodes);

      const initEdges = new Set(
        newMap.edges
          .filter((e) => initNodes.has(e.sourceNodeId) && initNodes.has(e.targetNodeId))
          .map((e) => e.id)
      );
      setSelectedEdgeIds(initEdges);
    } catch (err: any) {
      console.error('[KNOWLEDGE MAP MODAL] Generation error:', err);
      setErrorMsg(err.message || 'Failed to generate research knowledge map');
      setStatusState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Node Selection Handlers
  const handleToggleNode = (nodeId: string) => {
    const nextNodes = new Set(selectedNodeIds);
    const nextEdges = new Set(selectedEdgeIds);

    if (nextNodes.has(nodeId)) {
      nextNodes.delete(nodeId);
      if (mapData) {
        for (const edge of mapData.edges) {
          if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
            nextEdges.delete(edge.id);
          }
        }
      }
    } else {
      nextNodes.add(nodeId);
    }

    setSelectedNodeIds(nextNodes);
    setSelectedEdgeIds(nextEdges);
  };

  const handleSelectAllNodes = () => {
    if (!mapData) return;
    const allNodeIds = new Set(mapData.nodes.map((n) => n.id));
    setSelectedNodeIds(allNodeIds);
  };

  const handleClearAllNodes = () => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
  };

  // Edge Selection Handlers
  const handleToggleEdge = (edge: ResearchKnowledgeEdge) => {
    const sourceApproved = selectedNodeIds.has(edge.sourceNodeId);
    const targetApproved = selectedNodeIds.has(edge.targetNodeId);

    if (!sourceApproved || !targetApproved) {
      setEdgeWarningMsg('Both concepts must be approved before this relationship can be added.');
      setTimeout(() => setEdgeWarningMsg(null), 4000);
      return;
    }

    const nextEdges = new Set(selectedEdgeIds);
    if (nextEdges.has(edge.id)) {
      nextEdges.delete(edge.id);
    } else {
      nextEdges.add(edge.id);
    }
    setSelectedEdgeIds(nextEdges);
  };

  // Approval Submit with Transition Animation
  const handleApprove = async () => {
    if (!mapData) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setApprovalPhase('analyzing');

    const approvedNodeIds = Array.from(selectedNodeIds);
    const approvedEdgeIds = Array.from(selectedEdgeIds);

    // Step 1: Transition "ANALYZING APPROVED GRAPH"
    await new Promise((resolve) => setTimeout(resolve, 600));
    setApprovalPhase('merging');

    try {
      const res = await fetch(`/api/research/knowledge-map/${mapData.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedNodeIds, approvedEdgeIds }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.code === 'GRAPH_MERGE_FAILED') {
          throw new Error('KNOWLEDGE GRAPH MERGE FAILED — Map remains pending. No partial approval was recorded.');
        }
        throw new Error(json.error || 'Failed to approve knowledge map');
      }

      // Step 2: Transition "GRAPH UPDATED ✓"
      setApprovalPhase('updated');
      await new Promise((resolve) => setTimeout(resolve, 500));

      setApprovedStats({ nodes: approvedNodeIds.length, edges: approvedEdgeIds.length });
      setMapData(json.data);
      setStatusState('success_approved');
    } catch (err: any) {
      console.error('[KNOWLEDGE MAP MODAL] Approve error:', err);
      setErrorMsg(err.message || 'Approval operation failed.');
      setApprovalPhase('idle');
    } finally {
      setIsSubmitting(false);
      setApprovalPhase('idle');
    }
  };

  // Reject Submit
  const handleReject = async () => {
    if (!mapData) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/research/knowledge-map/${mapData.id}/reject`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reject knowledge map');
      }

      setMapData(json.data);
      setStatusState('success_rejected');
    } catch (err: any) {
      console.error('[KNOWLEDGE MAP MODAL] Reject error:', err);
      setErrorMsg(err.message || 'Rejection operation failed.');
    } finally {
      setIsSubmitting(false);
      setShowRejectConfirm(false);
    }
  };

  if (!open) return null;

  const totalNodes = mapData?.nodes.length || 0;
  const totalEdges = mapData?.edges.length || 0;
  const selectedNodesCount = selectedNodeIds.size;
  const selectedEdgesCount = selectedEdgeIds.size;

  const nodeMapById = new Map<string, ResearchKnowledgeNode>();
  mapData?.nodes.forEach((n) => nodeMapById.set(n.id, n));

  const eligibleEdgesCount = mapData
    ? mapData.edges.filter(
        (e) => selectedNodeIds.has(e.sourceNodeId) && selectedNodeIds.has(e.targetNodeId)
      ).length
    : 0;

  const avgConfidence = mapData && mapData.nodes.length > 0
    ? Math.round(mapData.nodes.reduce((acc, n) => acc + (n.confidence || 90), 0) / mapData.nodes.length)
    : 90;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="knowledge-map-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-os-fade"
    >
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[var(--cyra-panel)] border border-[var(--cyra-border-strong)] rounded-2xl shadow-2xl overflow-hidden text-[var(--cyra-text)]">
        
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="p-4 md:p-5 bg-[var(--cyra-panel)] border-b border-[var(--cyra-border)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--pastel-blue-bg)] border border-[var(--cyra-border)] text-[var(--cyra-cyan)]">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="knowledge-map-title" className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--cyra-cyan)]">
                  RESEARCH KNOWLEDGE MAP
                </span>
                {statusState === 'pending' && (
                  <span className="os-badge os-badge-amber">PENDING REVIEW</span>
                )}
                {statusState === 'approved' && (
                  <span className="os-badge os-badge-emerald">APPROVED</span>
                )}
                {statusState === 'rejected' && (
                  <span className="os-badge os-badge-rose">REJECTED</span>
                )}
              </div>
              <h2 className="text-sm font-bold text-[var(--cyra-text)] line-clamp-1 mt-0.5 font-sans">
                {researchTitle || mapData?.title || 'Understanding Myopia & Evidence Synthesis'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="p-2 rounded-lg text-[var(--cyra-text-muted)] hover:text-[var(--cyra-text)] bg-[var(--cyra-card-soft)] border border-[var(--cyra-border)] hover:border-[var(--cyra-border-strong)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── TOP METRICS ROW ─────────────────────────────────────── */}
        {mapData && statusState === 'pending' && (
          <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-[var(--cyra-card-soft)] border-b border-[var(--cyra-border)] font-mono text-xs">
            <div className="flex items-center justify-center gap-2 text-[var(--cyra-cyan)]">
              <Database className="w-3.5 h-3.5" />
              <span className="font-bold">{totalNodes} CONCEPTS</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[var(--cyra-violet)] border-x border-[var(--cyra-border)]">
              <GitFork className="w-3.5 h-3.5" />
              <span className="font-bold">{totalEdges} RELATIONSHIPS</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-[var(--cyra-green)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-bold">{avgConfidence}% CONFIDENCE</span>
            </div>
          </div>
        )}

        {/* ── MODAL BODY CONTENT ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[var(--cyra-bg)]">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider">Operation Error</p>
                <p className="mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* 1. LOADING STATE */}
          {statusState === 'loading' && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 font-mono">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-400">Synthesizing neural research graph...</p>
            </div>
          )}

          {/* 2. NO MAP STATE */}
          {statusState === 'no_map' && (
            <div className="py-16 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <GitFork className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono uppercase">NO KNOWLEDGE MAP GENERATED</h3>
                <p className="mt-2 text-xs text-slate-400 font-mono">
                  Extract concept candidates and prerequisite relationships to connect research evidence to your personal knowledge graph.
                </p>
              </div>
              <button
                onClick={handleGenerateMap}
                disabled={isSubmitting}
                className="w-full os-button-primary justify-center py-2.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>GENERATING KNOWLEDGE MAP...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>GENERATE KNOWLEDGE MAP</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 3. PENDING REVIEW STATE: NEURAL GRAPH & RIGHT PANEL */}
          {statusState === 'pending' && mapData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT / MAIN CANVAS: NEURAL RESEARCH GRAPH PREVIEW (8 COLS) */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Visual Neural Network Graph Diagram */}
                <KnowledgeGraphVisualization
                  nodes={mapData.nodes}
                  edges={mapData.edges}
                  selectedNodeIds={selectedNodeIds}
                  selectedEdgeIds={selectedEdgeIds}
                  onToggleNode={handleToggleNode}
                  onToggleEdge={handleToggleEdge}
                />

                {/* Concept Nodes List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      EXTRACTED CONCEPTS ({totalNodes})
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={handleSelectAllNodes} className="text-[11px] font-mono text-cyan-400 font-bold hover:underline">
                        SELECT ALL
                      </button>
                      <span className="text-slate-600">•</span>
                      <button onClick={handleClearAllNodes} className="text-[11px] font-mono text-slate-400 hover:underline">
                        CLEAR ALL
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mapData.nodes.map((node) => {
                      const isSelected = selectedNodeIds.has(node.id);
                      const isMatched = node.nodeType === 'matched_concept';
                      const isNew = node.nodeType === 'new_concept';
                      const isAmbiguous = node.matchStatus === 'unmatched' && node.confidence === 50;

                      return (
                        <div
                          key={node.id}
                          onClick={() => handleToggleNode(node.id)}
                          className={`os-card p-4 space-y-2 cursor-pointer ${
                            isSelected ? 'os-card-active' : 'opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                              <h4 className="text-xs font-bold text-white leading-snug">{node.label}</h4>
                            </div>

                            {isMatched && <span className="os-badge os-badge-cyan">MATCHED</span>}
                            {isNew && <span className="os-badge os-badge-indigo">NEW</span>}
                            {isAmbiguous && <span className="os-badge os-badge-amber">AMBIGUOUS</span>}
                          </div>

                          <p className="text-[11px] font-mono text-slate-400 italic line-clamp-2">{node.evidence}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: APPROVAL SUMMARY & GRAPH IMPACT (4 COLS) */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="os-card p-5 space-y-5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
                  <div className="flex items-center gap-2 border-b border-[var(--cyra-border)] pb-3 text-xs font-mono font-bold text-[var(--cyra-text)] uppercase">
                    <Activity className="w-4 h-4 text-[var(--cyra-cyan)]" />
                    <span>APPROVAL SUMMARY</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--cyra-text-secondary)]">Concepts:</span>
                      <span className="font-bold text-[var(--cyra-cyan)]">{selectedNodesCount} / {totalNodes} approved</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--cyra-text-secondary)]">Relationships:</span>
                      <span className="font-bold text-[var(--cyra-violet)]">{selectedEdgesCount} / {totalEdges} selected</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--cyra-border)] space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--cyra-text-muted)] block">GRAPH IMPACT</span>
                    <div className="p-3 rounded-lg bg-[var(--cyra-card-soft)] border border-[var(--cyra-border)] space-y-1 font-mono text-xs">
                      <p className="text-[var(--cyra-green)] font-bold">+{selectedNodesCount} concepts</p>
                      <p className="text-[var(--cyra-cyan)] font-bold">+{selectedEdgesCount} relationships</p>
                      {selectedEdgesCount === 0 && selectedNodesCount > 0 && (
                        <p className="text-[10px] text-[var(--cyra-text-muted)] mt-1.5 font-sans leading-relaxed border-t border-[var(--cyra-border)] pt-1.5">
                          Note: Selected concepts will merge as standalone nodes until new relationship edges are discovered.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 4. SUCCESS APPROVED STATE */}
          {statusState === 'success_approved' && (
            <div className="py-16 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5 font-mono">
              <div className="p-4 rounded-2xl bg-[var(--pastel-mint-bg)] border border-[var(--cyra-border)] text-[var(--cyra-green)]">
                <ShieldCheck className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--cyra-text)] uppercase tracking-wider font-sans">KNOWLEDGE MAP APPROVED</h3>
                <p className="mt-2 text-xs text-[var(--cyra-green)] font-bold">
                  {approvedStats.nodes} CONCEPTS APPROVED · {approvedStats.edges} RELATIONSHIPS MERGED
                </p>
                <p className="mt-1 text-[11px] text-[var(--cyra-text-secondary)] italic font-sans">
                  Approved concepts have been successfully merged into your learner knowledge graph.
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-full os-button-primary justify-center py-2.5"
              >
                DONE
              </button>
            </div>
          )}

          {/* 5. SUCCESS REJECTED STATE */}
          {statusState === 'success_rejected' && (
            <div className="py-16 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5 font-mono">
              <div className="p-4 rounded-2xl bg-[rgba(212,93,107,0.1)] border border-[var(--cyra-border)] text-[var(--cyra-red)]">
                <X className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--cyra-text)] uppercase tracking-wider font-sans">MAP REJECTED</h3>
                <p className="mt-2 text-xs text-[var(--cyra-text-secondary)] font-sans">
                  This proposed research knowledge map was rejected.
                </p>
              </div>
              <button onClick={handleGenerateMap} disabled={isSubmitting} className="w-full os-button-primary justify-center py-2.5">
                <span>GENERATE NEW MAP</span>
              </button>
            </div>
          )}
        </div>

        {/* ── BOTTOM ACTIONS (FOR PENDING REVIEW MODE) ─────────────── */}
        {statusState === 'pending' && (
          <div className="p-4 bg-[var(--cyra-panel)] border-t border-[var(--cyra-border)] flex items-center justify-between gap-3 flex-wrap">
            {showRejectConfirm ? (
              <div className="flex items-center gap-3 w-full justify-between font-mono text-xs">
                <p className="text-rose-300">Reject this proposed map?</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowRejectConfirm(false)} disabled={isSubmitting} className="os-button-secondary">
                    CANCEL
                  </button>
                  <button onClick={handleReject} disabled={isSubmitting} className="os-button-secondary border-rose-500 text-rose-400">
                    {isSubmitting ? 'REJECTING...' : 'REJECT MAP'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={isSubmitting}
                  className="os-button-secondary text-rose-400 border-rose-500/30 hover:border-rose-500"
                >
                  [ REJECT MAP ]
                </button>

                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="os-button-primary ml-auto py-2 px-6"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>
                        {approvalPhase === 'analyzing'
                          ? 'ANALYZING APPROVED GRAPH...'
                          : approvalPhase === 'merging'
                          ? 'MERGING KNOWLEDGE...'
                          : 'GRAPH UPDATED ✓'}
                      </span>
                    </div>
                  ) : (
                    <span>[ APPROVE & MERGE ]</span>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchKnowledgeMapModal;
