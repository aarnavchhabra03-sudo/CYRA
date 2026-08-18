'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Map,
  FileText,
  BookOpen,
  FileCheck,
  Bot,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

import RoadmapTab from '@/components/roadmap-tab';
import NotesTab from '@/components/notes-tab';
import ResourcesTab from '@/components/resources-tab';
import QuizTab from '@/components/quiz-tab';
import TutorTab from '@/components/tutor-tab';

import {
  mockOSCourseDetail,
  Module as UIModule,
} from '@/data/mockData';

type TabType =
  | 'roadmap'
  | 'notes'
  | 'resources'
  | 'quiz'
  | 'tutor';

const TABS: {
  type: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
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

  const [activeTab, setActiveTab] =
    useState<TabType>('roadmap');

  const [activeNodeId, setActiveNodeId] = useState('');

  const [tutorCtx, setTutorCtx] = useState('');

  /*
   * ---------------------------------------------------------
   * FETCH COURSE DATA
   * ---------------------------------------------------------
   */

  const fetchCourseData = useCallback(
    async (isSilent = false) => {
      if (!learningPathId) return;

      if (!isSilent) {
        setLoading(true);
      }

      setError(null);

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError(
            'Please sign in to access your learning path workspace.'
          );
          setLoading(false);
          return;
        }

        /*
         * -----------------------------------------------------
         * FETCH REAL LEARNING PATH
         * -----------------------------------------------------
         */

        const {
          data: pathData,
          error: pathErr,
        } = await supabase
          .from('learning_paths')
          .select('*')
          .eq('id', learningPathId)
          .single();

        /*
         * -----------------------------------------------------
         * DEMO / FALLBACK COURSE
         *
         * IMPORTANT:
         * The mock course is intentionally retained so the UI
         * can still be previewed without a populated DB.
         * -----------------------------------------------------
         */

        if (
          pathErr ||
          !pathData ||
          pathData.user_id !== user.id
        ) {
          if (
            learningPathId === '1' ||
            learningPathId === 'os-101' ||
            learningPathId === 'operating-systems'
          ) {
            setTitle(mockOSCourseDetail.title);

            setGoal(
              'Computer Science Fundamentals'
            );

            setProgress(
              mockOSCourseDetail.progress
            );

            /*
             * Clone the data so the component does not
             * accidentally mutate the original mock object.
             */
            setUiModules(
              JSON.parse(
                JSON.stringify(
                  mockOSCourseDetail.modules
                )
              )
            );

            /*
             * Start with the first available node.
             */
            const firstNode =
              mockOSCourseDetail.modules
                .flatMap((module) => module.nodes)
                .find(
                  (node) =>
                    node.status === 'in_progress'
                ) ||
              mockOSCourseDetail.modules
                .flatMap((module) => module.nodes)
                .find(
                  (node) =>
                    node.status === 'completed'
                );

            if (firstNode) {
              setActiveNodeId(firstNode.id);
            }

            setLoading(false);
            return;
          }

          setError(
            'Learning path not found or access denied.'
          );

          setLoading(false);
          return;
        }

        /*
         * -----------------------------------------------------
         * REAL COURSE
         * -----------------------------------------------------
         */

        setTitle(pathData.title);

        setGoal(
          `${
            pathData.experience_level
              ? pathData.experience_level.toUpperCase()
              : 'INTERMEDIATE'
          } • ${
            pathData.goal ||
            'Computer Science Fundamentals'
          }`
        );

        setProgress(pathData.progress || 0);

        /*
         * -----------------------------------------------------
         * FETCH MODULES
         * -----------------------------------------------------
         */

        const {
          data: modulesData,
        } = await supabase
          .from('modules')
          .select('*')
          .eq(
            'learning_path_id',
            learningPathId
          )
          .order('module_order', {
            ascending: true,
          });

        if (
          !modulesData ||
          modulesData.length === 0
        ) {
          setUiModules([]);
          setLoading(false);
          return;
        }

        const moduleIds =
          modulesData.map(
            (module) => module.id
          );

        /*
         * -----------------------------------------------------
         * FETCH LESSONS
         * -----------------------------------------------------
         */

        const {
          data: lessonsData,
        } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('lesson_order', {
            ascending: true,
          });

        const lessonIds =
          lessonsData?.map(
            (lesson) => lesson.id
          ) || [];

        /*
         * -----------------------------------------------------
         * FETCH USER PROGRESS
         * -----------------------------------------------------
         */

        const {
          data: progressData,
        } =
          lessonIds.length > 0
            ? await supabase
                .from('user_progress')
                .select('lesson_id')
                .eq(
                  'user_id',
                  user.id
                )
                .in(
                  'lesson_id',
                  lessonIds
                )
            : { data: [] };

        const completedLessonSet =
          new Set(
            progressData?.map(
              (item) =>
                item.lesson_id
            ) || []
          );

        /*
         * -----------------------------------------------------
         * MAP DATABASE → UI
         * -----------------------------------------------------
         */

        const mappedUiModules: UIModule[] =
          modulesData.map(
            (module, moduleIndex) => {
              const moduleLessons =
                lessonsData
                  ?.filter(
                    (lesson) =>
                      lesson.module_id ===
                      module.id
                  )
                  .sort(
                    (a, b) =>
                      a.lesson_order -
                      b.lesson_order
                  ) || [];

              const nodes =
                moduleLessons.map(
                  (lesson, lessonIndex) => {
                    const isCompleted =
                      completedLessonSet.has(
                        lesson.id
                      );

                    const isFirst =
                      moduleIndex === 0 &&
                      lessonIndex === 0;

                    let status:
                      | 'completed'
                      | 'in_progress'
                      | 'locked' =
                      'locked';

                    if (isCompleted) {
                      status = 'completed';
                    } else if (
                      isFirst ||
                      moduleIndex === 0
                    ) {
                      status = 'in_progress';
                    }

                    return {
                      id: lesson.id,

                      title: lesson.title,

                      description:
                        lesson.description ||
                        (lesson.content
                          ? lesson.content
                              .split('\n')[0]
                              .replace(
                                /^#+\s*/,
                                ''
                              )
                          : ''),

                      content:
                        lesson.content || '',

                      status,

                      type:
                        'concept' as const,

                      estimatedMinutes:
                        lesson.estimated_minutes ||
                        15,

                      topics: lesson.content
                        ? [
                            lesson.content
                              .split('\n')[0]
                              .replace(
                                /^#+\s*/,
                                ''
                              ),
                          ]
                        : [lesson.title],
                    };
                  }
                );

              const completedNodes =
                nodes.filter(
                  (node) =>
                    node.status ===
                    'completed'
                ).length;

              const moduleProgress =
                nodes.length > 0
                  ? Math.round(
                      (completedNodes /
                        nodes.length) *
                        100
                    )
                  : 0;

              const allCompleted =
                nodes.length > 0 &&
                completedNodes ===
                  nodes.length;

              return {
                id: module.id,

                title: module.title,

                description:
                  module.description || '',

                progress:
                  moduleProgress,

                status: allCompleted
                  ? 'completed'
                  : moduleIndex === 0
                  ? 'in_progress'
                  : 'locked',

                nodes,
              };
            }
          );

        setUiModules(mappedUiModules);

        /*
         * Automatically select the first available lesson.
         */

        if (
          mappedUiModules.length > 0
        ) {
          const firstNode =
            mappedUiModules
              .flatMap(
                (module) =>
                  module.nodes
              )
              .find(
                (node) =>
                  node.status ===
                  'in_progress'
              ) ||
            mappedUiModules[0]?.nodes?.[0];

          if (firstNode) {
            setActiveNodeId(
              (current) =>
                current ||
                firstNode.id
            );
          }
        }
      } catch (err) {
        console.error(
          'Error fetching workspace:',
          err
        );

        setError(
          'Failed to load course workspace.'
        );
      } finally {
        setLoading(false);
      }
    },
    [learningPathId]
  );

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  /*
   * ---------------------------------------------------------
   * TAB SWITCHING
   * ---------------------------------------------------------
   */

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);

    if (tab !== 'tutor') {
      setTutorCtx('');
    }
  };

  /*
   * ---------------------------------------------------------
   * FLATTEN LESSON NODES
   * ---------------------------------------------------------
   */

  const allNodes = uiModules.flatMap(
    (module) =>
      module.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        description: node.description,
        content:
          (node as any).content || '',
        status: node.status,
      }))
  );

  const activeNodeObj =
    allNodes.find(
      (node) =>
        node.id === activeNodeId
    ) || allNodes[0];

  /*
   * ---------------------------------------------------------
   * NOTES MAP
   * ---------------------------------------------------------
   */

  const notesMap: {
    [nodeId: string]: {
      title: string;
      content: string;
    };
  } = {};

  uiModules.forEach((module) => {
    module.nodes.forEach((node) => {
      notesMap[node.id] = {
        title: node.title,
        content:
          (node as any).content ||
          node.description ||
          'Study notes for this lesson are available in the interactive lesson reader.',
      };
    });
  });

  /*
   * ---------------------------------------------------------
   * LOADING STATE
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050A12] text-[#EAF6FF] flex flex-col items-center justify-center gap-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-[#0B1624] border border-[#183149] flex items-center justify-center shadow-[0_0_30px_rgba(20,184,232,0.08)]">
          <Loader2 className="w-7 h-7 text-[#18B8E8] animate-spin" />
        </div>

        <div className="text-center">
          <p className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-[#18B8E8]">
            CYRA
          </p>

          <p className="text-xs font-mono text-[#7188A0] mt-1">
            Loading learning workspace...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR STATE
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <div className="min-h-screen bg-[#050A12] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl bg-[#0A1421] border border-[#1C3349] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>

          <h3 className="text-base font-bold text-white">
            Workspace Error
          </h3>

          <p className="text-xs text-[#7D91A7] leading-relaxed mt-2">
            {error}
          </p>

          <Link
            href="/courses"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-[#101D2C] border border-[#294158] text-xs font-bold text-[#BBD5E7] hover:border-[#18B8E8] hover:text-[#18B8E8] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to My Courses
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN COURSE WORKSPACE
   * ---------------------------------------------------------
   */

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050A12] text-[#EAF6FF] font-sans">

      {/* =====================================================
          COURSE HEADER
      ===================================================== */}

      <header className="flex-shrink-0 px-5 md:px-8 py-4 bg-[#07101B] border-b border-[#182B3E]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <Link
              href="/courses"
              title="Back to Courses"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0B1725] border border-[#223A51] text-[#7891A8] hover:text-[#18B8E8] hover:border-[#18B8E8]/50 hover:bg-[#0E1D2D] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-px h-8 bg-[#1B3044] hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-[#18B8E8]">
                  CYRA LEARNING OS
                </span>

                <Sparkles className="w-3 h-3 text-[#6366F1]" />
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug mt-0.5">
                {title || 'Learning Workspace'}
              </h1>

              <p className="text-xs text-[#7188A0] mt-0.5">
                {goal || 'Computer Science Fundamentals'}
              </p>
            </div>
          </div>

          {/* Progress */}

          <div className="flex items-center gap-5">

            {activeNodeObj && (
              <div className="hidden md:block text-right max-w-[240px]">
                <span className="text-[9px] font-mono font-bold text-[#526A80] uppercase tracking-[0.15em] block">
                  CURRENT TOPIC
                </span>

                <span className="text-xs text-[#91A8BB] truncate block mt-1">
                  {activeNodeObj.title}
                </span>
              </div>
            )}

            <div className="h-8 w-px bg-[#1B3044] hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-[#526A80] block">
                  PROGRESS
                </span>

                <span className="text-xs font-mono font-bold text-[#D8ECF8]">
                  {progress}%
                </span>
              </div>

              <div className="w-28 md:w-36 h-2 rounded-full overflow-hidden bg-[#152536] border border-[#1D3448]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#18B8E8] transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, progress)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="flex-shrink-0 px-4 md:px-8 bg-[#07101B] border-b border-[#182B3E] overflow-x-auto">
        <div className="flex gap-1 min-w-max">

          {TABS.map(
            ({
              type,
              label,
              icon: Icon,
            }) => {
              const active =
                activeTab === type;

              return (
                <button
                  key={type}
                  onClick={() =>
                    switchTab(type)
                  }
                  className={`relative flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all ${
                    active
                      ? 'text-[#18B8E8]'
                      : 'text-[#7188A0] hover:text-[#D9ECF7]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active
                        ? 'text-[#18B8E8]'
                        : 'text-[#607B92]'
                    }`}
                  />

                  <span>{label}</span>

                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full bg-gradient-to-r from-[#6366F1] to-[#18B8E8]" />
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="flex-1 overflow-y-auto bg-[#050A12]">

        <div className="min-h-full p-4 md:p-6 lg:p-8">

          {activeTab === 'roadmap' && (
            <RoadmapTab
              modules={uiModules}
              learningPathId={learningPathId}
              onSelectNode={(nodeId) =>
                setActiveNodeId(nodeId)
              }
              onSwitchTab={switchTab}
              onOpenLesson={(lessonId) =>
                router.push(
                  `/learn/${learningPathId}/lesson/${lessonId}`
                )
              }
            />
          )}

          {activeTab === 'notes' && (
            <NotesTab
              notes={notesMap}
              activeNodeId={activeNodeId}
              nodeList={allNodes}
              onSelectNode={
                setActiveNodeId
              }
              onAskTutorAboutNote={(
                text
              ) => {
                setTutorCtx(text);
                setActiveTab('tutor');
              }}
            />
          )}

          {activeTab === 'resources' && (
            <ResourcesTab
              activeNodeId={
                activeNodeId
              }
              nodeList={allNodes}
              onSelectNode={
                setActiveNodeId
              }
            />
          )}

          {activeTab === 'quiz' && (
            <QuizTab
              activeNodeId={
                activeNodeId
              }
              nodeList={allNodes}
              onSelectNode={
                setActiveNodeId
              }
              onSwitchTab={switchTab}
              onCompleteQuiz={(
                pct
              ) => {
                if (pct >= 60) {
                  setProgress(
                    (value) =>
                      Math.min(
                        100,
                        value + 15
                      )
                  );
                }

                fetchCourseData(true);
              }}
            />
          )}

          {activeTab === 'tutor' && (
            <TutorTab
              learningPathId={
                learningPathId
              }
              lessonId={
                activeNodeId ||
                undefined
              }
              initialContext={
                tutorCtx
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
