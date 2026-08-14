'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Map, FileText, BookOpen, FileCheck, Bot, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import RoadmapTab from '@/components/roadmap-tab';
import NotesTab from '@/components/notes-tab';
import ResourcesTab from '@/components/resources-tab';
import QuizTab from '@/components/quiz-tab';
import TutorTab from '@/components/tutor-tab';
import { mockOSCourseDetail, Module as UIModule } from '@/data/mockData';

type TabType = 'roadmap' | 'notes' | 'resources' | 'quiz' | 'tutor';

const TABS: { type: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'roadmap', label: 'Roadmap', icon: Map },
  { type: 'notes', label: 'Study Notes', icon: FileText },
  { type: 'resources', label: 'Resources', icon: BookOpen },
  { type: 'quiz', label: 'Quiz', icon: FileCheck },
  { type: 'tutor', label: 'AI Tutor', icon: Bot },
];

export default function CourseWorkspace() {
  const params = useParams();
  const learningPathId = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [progress, setProgress] = useState(0);
  const [uiModules, setUiModules] = useState<UIModule[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('roadmap');
  const [activeNodeId, setActiveNodeId] = useState('');
  const [tutorCtx, setTutorCtx] = useState('');

  const fetchCourseData = useCallback(async (isSilent: boolean = false) => {
    if (!learningPathId) return;

    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to access your learning path workspace.');
        setLoading(false);
        return;
      }

      // Fetch Learning Path
      const { data: pathData, error: pathErr } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('id', learningPathId)
        .single();

      if (pathErr || !pathData || pathData.user_id !== user.id) {
        if (learningPathId === '1' || learningPathId === 'os-101' || learningPathId === 'operating-systems') {
          setTitle(mockOSCourseDetail.title);
          setGoal('Computer Science Fundamentals');
          setProgress(mockOSCourseDetail.progress);
          setUiModules(mockOSCourseDetail.modules);
          setLoading(false);
          return;
        }

        setError('Learning path not found or access denied.');
        setLoading(false);
        return;
      }

      setTitle(pathData.title);
      setGoal(`${pathData.experience_level ? pathData.experience_level.toUpperCase() : 'INTERMEDIATE'} • ${pathData.goal || 'Computer Science Fundamentals'}`);
      setProgress(pathData.progress || 42);

      // Fetch Modules for Path
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('learning_path_id', learningPathId)
        .order('module_order', { ascending: true });

      if (!modulesData || modulesData.length === 0) {
        setUiModules([]);
        setLoading(false);
        return;
      }

      const moduleIds = modulesData.map(m => m.id);

      // Fetch Lessons for Modules
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .in('module_id', moduleIds)
        .order('lesson_order', { ascending: true });

      const lessonIds = lessonsData ? lessonsData.map(l => l.id) : [];
      const { data: progressData } = lessonIds.length > 0
        ? await supabase
            .from('user_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)
        : { data: [] };

      const completedLessonSet = new Set(progressData?.map(p => p.lesson_id) || []);

      const mappedUiModules: UIModule[] = modulesData.map((mod, modIdx) => {
        const modLessons = lessonsData
          ? lessonsData.filter(l => l.module_id === mod.id).sort((a, b) => a.lesson_order - b.lesson_order)
          : [];

        const nodes = modLessons.map((l, lIdx) => {
          const isCompleted = completedLessonSet.has(l.id);
          const isFirst = modIdx === 0 && lIdx === 0;

          let status: 'completed' | 'in_progress' | 'locked' = 'locked';
          if (isCompleted) {
            status = 'completed';
          } else if (isFirst || modIdx === 0) {
            status = 'in_progress';
          }

          return {
            id: l.id,
            title: l.title,
            description: l.description || (l.content ? l.content.split('\n')[0].replace(/^#+\s*/, '') : ''),
            content: l.content || '',
            status,
            type: 'concept' as const,
            estimatedMinutes: l.estimated_minutes || 15,
            topics: l.content ? [l.content.split('\n')[0].replace(/^#+\s*/, '')] : [l.title],
          };
        });

        const completedNodesCount = nodes.filter(n => n.status === 'completed').length;
        const modProgress = nodes.length > 0 ? Math.round((completedNodesCount / nodes.length) * 100) : 0;
        const allModCompleted = nodes.length > 0 && completedNodesCount === nodes.length;

        const modStatus: 'completed' | 'in_progress' | 'locked' = allModCompleted
          ? 'completed'
          : modIdx === 0 ? 'in_progress' : 'locked';

        return {
          id: mod.id,
          title: mod.title,
          description: mod.description || '',
          progress: modProgress,
          status: modStatus,
          nodes,
        };
      });

      setUiModules(mappedUiModules);
      if (mappedUiModules.length > 0 && mappedUiModules[0].nodes.length > 0) {
        const firstInProgress = mappedUiModules[0].nodes.find(n => n.status === 'in_progress');
        const defaultNodeId = firstInProgress ? firstInProgress.id : mappedUiModules[0].nodes[0].id;
        setActiveNodeId(prev => prev || defaultNodeId);
      }
    } catch (err) {
      console.error('Error fetching workspace:', err);
      setError('Failed to load course workspace.');
    } finally {
      setLoading(false);
    }
  }, [learningPathId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'tutor') setTutorCtx('');
  };

  const allNodes = uiModules.flatMap(m =>
    m.nodes.map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      content: (n as any).content || '',
      status: n.status
    }))
  );

  const activeNodeObj = allNodes.find(n => n.id === activeNodeId) || allNodes[0];

  const notesMap: { [nodeId: string]: { title: string; content: string } } = {};
  uiModules.forEach(m => {
    m.nodes.forEach(n => {
      notesMap[n.id] = {
        title: n.title,
        content: (n as any).content || n.description || 'Study notes for this lesson are available in the interactive lesson reader.'
      };
    });
  });

  if (loading) {
    return (
      <div className="h-screen bg-[#F6F9FC] flex flex-col items-center justify-center gap-3 text-center font-sans">
        <Loader2 className="w-8 h-8 text-[#149FC4] animate-spin" />
        <p className="text-xs font-mono text-[#60758A]">Loading CYRA Workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#F6F9FC] flex items-center justify-center p-6 font-sans">
        <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D9E2EC] text-center max-w-md space-y-4 shadow-[0_6px_24px_rgba(40,70,100,0.05)]">
          <AlertTriangle className="w-8 h-8 text-[#D45D6B] mx-auto" />
          <h3 className="text-base font-bold text-[#172033]">Workspace Error</h3>
          <p className="text-xs text-[#60758A] leading-relaxed">{error}</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#C5D2E0] text-xs font-bold text-[#286B91] hover:bg-[#F0F5FA] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Courses</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F6F9FC] text-[#172033] font-sans">
      {/* ── COURSE HEADER (PURE WHITE LIGHT MODE HEADER) ─────────────── */}
      <header className="px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 bg-[#FFFFFF] border-b border-[#D9E2EC] shadow-[0_2px_12px_rgba(40,70,100,0.04)]">
        <div className="flex items-center gap-4">
          <Link
            href="/courses"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#C5D2E0] text-[#60758A] hover:bg-[#F0F5FA] hover:border-[#149FC4] hover:text-[#149FC4] transition-all flex-shrink-0 cursor-pointer shadow-xs"
            title="Back to Courses"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-px h-8 bg-[#D9E2EC] hidden sm:block" />

          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#172033] tracking-tight leading-snug">
              {title || 'Operating Systems'}
            </h1>
            <p className="text-xs font-sans text-[#718198] mt-0.5 font-medium">
              {goal || 'Computer Science Fundamentals'}
            </p>
          </div>
        </div>

        {/* Right Side: Progress Track & Secondary Course Label */}
        <div className="flex items-center gap-6">
          {/* Active Concept Label / Right Metadata */}
          {activeNodeObj && (
            <div className="hidden lg:block text-right">
              <span className="text-[10px] font-mono font-bold text-[#718198] uppercase block">CURRENT TOPIC</span>
              <span className="text-xs font-sans font-medium text-[#718198] truncate max-w-[200px] block">
                {activeNodeObj.title || 'Memory Management & Virtual Memory'}
              </span>
            </div>
          )}

          {/* Progress Bar & Percentage */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-[#60758A]">
              {progress}% complete
            </span>
            <div className="w-32 h-2 rounded-full overflow-hidden bg-[#D9E2EC]">
              <div
                className="h-full rounded-full bg-[#149FC4] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── COURSE TABS BAR (WHITE LIGHT MODE TABS) ──────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0 px-8 bg-[#FFFFFF] border-b border-[#D9E2EC]">
        <div className="flex gap-2">
          {TABS.map(({ type, label, icon: Icon }) => {
            const active = activeTab === type;
            return (
              <button
                key={type}
                onClick={() => switchTab(type)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all cursor-pointer ${
                  active ? 'text-[#286B91]' : 'text-[#60758A] hover:text-[#172033]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#149FC4]' : 'text-[#60758A]'}`} />
                <span>{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#149FC4] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT WORKSPACE ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#F6F9FC]">
        {activeTab === 'roadmap' && (
          <RoadmapTab
            modules={uiModules}
            learningPathId={learningPathId}
            onSelectNode={(nodeId) => setActiveNodeId(nodeId)}
            onSwitchTab={switchTab}
            onOpenLesson={(lessonId) => router.push(`/learn/${learningPathId}/lesson/${lessonId}`)}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            notes={notesMap}
            activeNodeId={activeNodeId}
            nodeList={allNodes}
            onSelectNode={setActiveNodeId}
            onAskTutorAboutNote={t => { setTutorCtx(t); setActiveTab('tutor'); }}
          />
        )}
        {activeTab === 'resources' && (
          <ResourcesTab
            activeNodeId={activeNodeId}
            nodeList={allNodes}
            onSelectNode={setActiveNodeId}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizTab
            activeNodeId={activeNodeId}
            nodeList={allNodes}
            onSelectNode={setActiveNodeId}
            onSwitchTab={switchTab}
            onCompleteQuiz={(pct, xp) => {
              if (pct >= 60) {
                setProgress(p => Math.min(100, p + 15));
              }
              fetchCourseData(true);
            }}
          />
        )}
        {activeTab === 'tutor' && <TutorTab learningPathId={learningPathId} lessonId={activeNodeId || undefined} initialContext={tutorCtx} />}
      </div>
    </div>
  );
}
