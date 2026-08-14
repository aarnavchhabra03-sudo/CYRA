'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Clock, 
  Compass, 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  BookOpen,
  Zap,
  Target,
  RotateCcw
} from 'lucide-react';
import { Module, RoadmapNode } from '@/data/mockData';

interface RoadmapTabProps {
  modules: Module[];
  learningPathId?: string;
  onSelectNode: (nodeId: string, nodeTitle: string) => void;
  onSwitchTab: (tabName: 'roadmap' | 'notes' | 'resources' | 'quiz' | 'tutor') => void;
  onOpenLesson?: (lessonId: string) => void;
}

export default function RoadmapTab({
  modules,
  learningPathId,
  onSelectNode,
  onSwitchTab,
  onOpenLesson
}: RoadmapTabProps) {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState<number>(0);
  const [selectedNodeIdx, setSelectedNodeIdx] = useState<number>(0);
  const [learningPlanTargets, setLearningPlanTargets] = useState<any[]>([]);
  const [nextAction, setNextAction] = useState<any | null>(null);
  const [reviewConceptNames, setReviewConceptNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadLearningData() {
      try {
        const query = learningPathId ? `?learningPathId=${encodeURIComponent(learningPathId)}` : '';
        
        // Load Adaptive Learning Plan
        const planRes = await fetch(`/api/adaptive/learning-plan${query}`);
        const planResult = await planRes.json();
        if (planRes.ok && planResult.success && planResult.data?.nextTargets) {
          setLearningPlanTargets(planResult.data.nextTargets);
        }

        // Load Orchestrated Next Best Action
        const actionRes = await fetch(`/api/adaptive/next-action${query}`);
        const actionResult = await actionRes.json();
        if (actionRes.ok && actionResult.success && actionResult.data?.nextBestAction) {
          const nba = actionResult.data.nextBestAction;
          setNextAction(nba);

          // Collect decayed concept names for badge rendering
          const decayed = new Set<string>();
          const decayedConcepts: Array<{ concept: string }> = actionResult.data.decayedConcepts || [];
          for (const dc of decayedConcepts) {
            decayed.add(dc.concept.toLowerCase().trim());
          }
          const decayReasonCodes = new Set(['MASTERY_DECAY_PRIORITY', 'MASTERY_DECAY_REVIEW']);
          if (decayReasonCodes.has(nba.reasonCode) && nba.concept) {
            decayed.add(nba.concept.toLowerCase().trim());
          }
          setReviewConceptNames(decayed);
        }
      } catch (err) {
        console.warn('[ROADMAP TAB] Error loading adaptive data:', err);
      }
    }

    loadLearningData();
  }, [learningPathId, modules]);

  const handleNodeClick = (node: RoadmapNode, moduleId: string, modIdx: number, nodeIdx: number) => {
    setSelectedNode(node);
    setSelectedModuleId(moduleId);
    setSelectedModuleIdx(modIdx);
    setSelectedNodeIdx(nodeIdx);
    onSelectNode(node.id, node.title);
  };

  const handleStartLearning = () => {
    if (!selectedNode) return;

    const dbLessonId = (selectedNode as any).dbLessonId;
    if (onOpenLesson && dbLessonId) {
      onOpenLesson(dbLessonId);
    } else {
      onSwitchTab('notes');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto font-sans">
      {/* LEFT / CENTER: Interactive Roadmap Modules & Adaptive Banners */}
      <div className="lg:col-span-2 space-y-9">
        
        {/* ── CYRA'S NEXT MOVE BANNER ─────────────────────────────────── */}
        {nextAction ? (
          <div className="p-6 rounded-2xl border border-[#C5D2E0] bg-gradient-to-r from-[#F0EEFF] via-[#EAF8FC] to-[#FFFFFF] space-y-4 shadow-[0_6px_24px_rgba(40,70,100,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-extrabold text-[#6259B4] uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#C4871B] animate-pulse" />
                CYRA&apos;S NEXT MOVE
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-lg bg-[#EAE7FF] border border-[#D9D5FB] text-[#6259B4]">
                Priority Score: {nextAction.priorityScore}/100
              </span>
            </div>

            <div>
              <h4 className="text-lg font-extrabold text-[#172033] tracking-tight">
                {nextAction.concept ? `${nextAction.action.replace('_', ' ').toUpperCase()}: ${nextAction.concept}` : nextAction.reason}
              </h4>
              <p className="text-xs text-[#60758A] mt-1 leading-relaxed font-sans font-medium">
                {nextAction.reason}
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => {
                  if (nextAction.action === 'ask_tutor') onSwitchTab('tutor');
                  else if (nextAction.action === 'revisit_notes' || nextAction.action === 'review_lesson') onSwitchTab('notes');
                  else if (nextAction.action === 'take_quiz') onSwitchTab('quiz');
                  else if (onOpenLesson && nextAction.lessonId) onOpenLesson(nextAction.lessonId);
                  else onSwitchTab('notes');
                }}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#5B6FF5] via-[#149FC4] to-[#20B889] hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_6px_18px_rgba(20,159,196,0.16)] flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Execute Action: {nextAction.action.replace('_', ' ').toUpperCase()}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {nextAction.secondaryActions && nextAction.secondaryActions.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[#60758A]">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#718198]">Other Options:</span>
                  {nextAction.secondaryActions.map((sec: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (sec.action === 'ask_tutor') onSwitchTab('tutor');
                        else if (sec.action === 'revisit_notes' || sec.action === 'review_lesson') onSwitchTab('notes');
                        else if (sec.action === 'take_quiz') onSwitchTab('quiz');
                        else onSwitchTab('notes');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EC] hover:bg-[#F0F5FA] hover:border-[#C5D2E0] text-[#60758A] hover:text-[#172033] font-sans text-xs transition-colors cursor-pointer capitalize font-bold"
                    >
                      {sec.action.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Default Refined Next Move Action Card */
          <div className="p-6 rounded-2xl border border-[#C5D2E0] bg-gradient-to-r from-[#F0EEFF] via-[#EAF8FC] to-[#FFFFFF] space-y-4 shadow-[0_6px_24px_rgba(40,70,100,0.05)] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-extrabold text-[#6259B4] uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#C4871B]" />
                CYRA&apos;S NEXT MOVE
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-lg bg-[#EAE7FF] border border-[#D9D5FB] text-[#6259B4]">
                Priority Score: 92/100
              </span>
            </div>

            <div>
              <h4 className="text-lg font-extrabold text-[#172033] tracking-tight">
                CONTINUE LESSON: Paging & Virtual Memory
              </h4>
              <p className="text-xs text-[#60758A] mt-1 leading-relaxed font-sans font-medium">
                Master page translation tables and TLB cache lookup before proceeding to page replacement algorithms.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2EC] flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => onSwitchTab('notes')}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#5B6FF5] via-[#149FC4] to-[#20B889] hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_6px_18px_rgba(20,159,196,0.16)] flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Execute Action: CONTINUE LESSON</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs text-[#60758A]">
                <span className="font-mono text-[10px] font-bold uppercase text-[#718198]">Other Options:</span>
                <button
                  onClick={() => onSwitchTab('notes')}
                  className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EC] hover:bg-[#F0F5FA] text-[#60758A] hover:text-[#172033] font-sans text-xs transition-colors cursor-pointer font-bold"
                >
                  Revisit Notes
                </button>
                <button
                  onClick={() => onSwitchTab('tutor')}
                  className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#D9E2EC] hover:bg-[#F0F5FA] text-[#60758A] hover:text-[#172033] font-sans text-xs transition-colors cursor-pointer font-bold"
                >
                  Ask Tutor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ROADMAP SECTION ────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-3">
            <h3 className="text-xs font-mono text-[#42546A] uppercase tracking-wider font-bold">
              CURRICULUM ROADMAP ({modules.length} MODULES)
            </h3>
            <span className="text-[10px] font-mono text-[#718198]">Select a node to inspect</span>
          </div>

          {modules.map((module, modIdx) => (
            <div 
              key={module.id} 
              className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#D9E2EC] space-y-4 shadow-[0_6px_24px_rgba(40,70,100,0.05)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#6259B4] font-extrabold uppercase tracking-wider">
                    MODULE {modIdx + 1}
                  </span>
                  <h4 className="text-base font-bold text-[#172033] mt-0.5 font-sans">{module.title}</h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#718198]">
                  {module.nodes.filter(n => n.status === 'completed').length} / {module.nodes.length} Completed
                </span>
              </div>

              {/* Lesson Nodes Sequence */}
              <div className="space-y-2.5 pt-1">
                {module.nodes.map((node, nodeIdx) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isCompleted = node.status === 'completed';
                  const isCurrent = node.status === 'in_progress';

                  let statusIcon = <Circle className="w-4 h-4 text-[#718198]" />;

                  if (isCompleted) {
                    statusIcon = <CheckCircle2 className="w-4 h-4 text-[#218A69]" />;
                  } else if (isCurrent) {
                    statusIcon = <Compass className="w-4 h-4 text-[#149FC4] animate-spin-slow" />;
                  }

                  return (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node, module.id, modIdx, nodeIdx)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer font-sans ${
                        isSelected 
                          ? 'border-[#149FC4] bg-[#EAF4FB] shadow-xs' 
                          : 'border-[#D9E2EC] bg-[#FFFFFF] hover:bg-[#F0F5FA] hover:border-[#C5D2E0]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {statusIcon}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#286B91]' : 'text-[#172033]'}`}>
                              {node.title}
                            </span>
                            {reviewConceptNames.has(node.title.toLowerCase().trim()) && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-[#FFF3E8] border border-[#FCD8B8] text-[#B56C32] flex-shrink-0"
                                title="Spaced repetition: This concept may have faded. A review is recommended."
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                NEEDS REVIEW
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-sans text-[#60758A] block truncate mt-0.5">
                            {node.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(node as any).duration && (
                          <span className="text-[10px] font-mono text-[#718198] flex items-center gap-1 hidden sm:inline-flex">
                            <Clock className="w-3.5 h-3.5 text-[#718198]" />
                            {(node as any).duration}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#149FC4] translate-x-0.5' : 'text-[#718198]'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT INSPECTOR PANEL ────────────────────────────────────── */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 p-6 rounded-2xl bg-[#FFFFFF] border border-[#D9E2EC] space-y-5 shadow-[0_6px_24px_rgba(40,70,100,0.05)] font-sans">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-3">
                <span className="text-[10px] font-mono text-[#6259B4] font-bold uppercase tracking-wider">
                  Module {selectedModuleIdx + 1} • Lesson {selectedNodeIdx + 1}
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                  selectedNode.status === 'completed' 
                    ? 'border-[#BDEBD9] text-[#218A69] bg-[#DDF6EC]' 
                    : 'border-[#C5DFF2] text-[#286B91] bg-[#DCEEFF]'
                }`}>
                  {selectedNode.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-[#172033] tracking-tight">{selectedNode.title}</h4>
                <p className="text-xs text-[#60758A] mt-2 leading-relaxed font-sans">{selectedNode.description}</p>
              </div>

              {(selectedNode as any).duration && (
                <div className="flex items-center gap-2 text-xs font-mono text-[#60758A] bg-[#F0F5FA] p-3 rounded-xl border border-[#D9E2EC]">
                  <Clock className="w-4 h-4 text-[#149FC4]" />
                  <span>Estimated Duration: {(selectedNode as any).duration}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#D9E2EC] space-y-2.5">
                <button
                  onClick={handleStartLearning}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#5B6FF5] via-[#149FC4] to-[#20B889] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_6px_18px_rgba(20,159,196,0.16)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Lesson & Study Notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onSwitchTab('quiz')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F5FA] border border-[#D9E2EC] text-[#286B91] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-[#149FC4]" />
                  <span>Take Quiz on This Topic</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-3">
              <Compass className="w-8 h-8 text-[#60758A] mx-auto animate-spin-slow" />
              <p className="text-sm font-bold text-[#172033]">Select a Lesson Node</p>
              <p className="text-xs text-[#60758A] max-w-xs mx-auto leading-relaxed font-sans">
                Click any lesson node in the roadmap sequence to inspect its description, study notes, and quiz actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
