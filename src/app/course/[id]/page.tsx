'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Map, FileText, BookOpen, FileCheck, Bot } from 'lucide-react';

import { mockOSCourseDetail } from '@/data/mockData';
import RoadmapTab from '@/components/roadmap-tab';
import NotesTab from '@/components/notes-tab';
import ResourcesTab from '@/components/resources-tab';
import QuizTab from '@/components/quiz-tab';
import TutorTab from '@/components/tutor-tab';

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
  const courseId = params?.id as string;
  const course = mockOSCourseDetail;

  const [activeTab, setActiveTab] = useState<TabType>('roadmap');
  const [activeNodeId, setActiveNodeId] = useState('node-2-1');
  const [tutorCtx, setTutorCtx] = useState('');
  const [progress, setProgress] = useState(course.progress || 42);

  const allNodes = course.modules.flatMap(m =>
    m.nodes.map(n => ({ id: n.id, title: n.title, status: n.status }))
  );

  const activeNodeObj = allNodes.find(n => n.id === activeNodeId) || allNodes[0];

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'tutor') setTutorCtx('');
  };

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
              {course.title || 'Operating Systems'}
            </h1>
            <p className="text-xs font-sans text-[#718198] mt-0.5 font-medium">
              Computer Science Fundamentals
            </p>
          </div>
        </div>

        {/* Right Side: Progress Track & Secondary Course Label */}
        <div className="flex items-center gap-6">
          {activeNodeObj && (
            <div className="hidden lg:block text-right">
              <span className="text-[10px] font-mono font-bold text-[#718198] uppercase block">CURRENT TOPIC</span>
              <span className="text-xs font-sans font-medium text-[#718198] truncate max-w-[200px] block">
                {activeNodeObj.title || 'Memory Management & Virtual Memory'}
              </span>
            </div>
          )}

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
            modules={course.modules}
            onSelectNode={(nodeId) => setActiveNodeId(nodeId)}
            onSwitchTab={switchTab}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            notes={{}}
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
          />
        )}
        {activeTab === 'tutor' && <TutorTab lessonId={activeNodeId || undefined} initialContext={tutorCtx} />}
      </div>
    </div>
  );
}
