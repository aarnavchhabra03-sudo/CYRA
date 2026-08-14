'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Plus, 
  ChevronRight, 
  GraduationCap, 
  Loader2, 
  AlertTriangle 
} from 'lucide-react';

interface LearningPathItem {
  id: string;
  title: string;
  goal: string | null;
  experience_level: string | null;
  minutes_per_day: number | null;
  created_at: string;
  progress?: number;
}

export default function CoursesIndexPage() {
  const [learningPaths, setLearningPaths] = useState<LearningPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserCourses() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error: err } = await supabase
            .from('learning_paths')
            .select('id, title, goal, experience_level, minutes_per_day, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (err) {
            setError(err.message);
          } else {
            setLearningPaths(data || []);
          }
        } else {
          const { data } = await supabase
            .from('learning_paths')
            .select('id, title, goal, experience_level, minutes_per_day, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

          setLearningPaths(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching courses:', err);
        setError('An unexpected error occurred while loading your courses.');
      } finally {
        setLoading(false);
      }
    }

    fetchUserCourses();
  }, []);

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6 bg-[var(--cyra-bg)] text-[var(--cyra-text)] min-h-screen text-left transition-colors duration-200">
      
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--cyra-border)]">
        <div>
          <div className="os-badge os-badge-indigo">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>LEARNING PATHWAY INDEX</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--cyra-text)] tracking-tight mt-1 font-sans">
            Active Learning Pathways
          </h1>
          <p className="text-xs text-[var(--cyra-text-secondary)] mt-1 font-sans">
            Access all your AI-synthesized curriculums and adaptive study roadmaps below.
          </p>
        </div>

        <Link
          href="/"
          className="os-button-primary"
        >
          <Plus className="w-4 h-4" />
          <span>+ NEW PATHWAY</span>
        </Link>
      </div>

      {/* ── LOADING STATE ───────────────────────────────────────────── */}
      {loading && (
        <div className="py-20 text-center space-y-3 font-mono">
          <Loader2 className="w-8 h-8 text-[var(--cyra-cyan)] animate-spin mx-auto" />
          <p className="text-xs text-[var(--cyra-text-secondary)]">Loading learning pathways from database...</p>
        </div>
      )}

      {/* ── ERROR STATE ─────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-8 rounded-xl bg-[rgba(217,92,106,0.1)] border border-[var(--cyra-red)] text-center max-w-md mx-auto space-y-3 font-mono">
          <AlertTriangle className="w-8 h-8 text-[var(--cyra-red)] mx-auto" />
          <h3 className="text-xs font-bold text-[var(--cyra-text)] uppercase">DATABASE ERROR</h3>
          <p className="text-xs text-[var(--cyra-text-secondary)]">{error}</p>
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
      {!loading && !error && learningPaths.length === 0 && (
        <div className="os-card p-10 text-center space-y-4 max-w-lg mx-auto bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
          <BookOpen className="w-10 h-10 text-[var(--cyra-text-muted)] mx-auto opacity-50" />
          <div>
            <h3 className="text-base font-bold text-[var(--cyra-text)] font-mono uppercase">NO ACTIVE LEARNING PATHWAYS</h3>
            <p className="text-xs text-[var(--cyra-text-secondary)] mt-1 leading-relaxed font-sans">
              Tell CYRA what subject you want to master and it will synthesize a structured curriculum for you.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/" className="os-button-primary">
              <Plus className="w-4 h-4" />
              <span>SYNTHESIZE FIRST PATHWAY</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── COURSES GRID ────────────────────────────────────────────── */}
      {!loading && !error && learningPaths.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {learningPaths.map((path) => (
            <Link
              key={path.id}
              href={`/learn/${path.id}`}
              className="os-card p-5 space-y-4 bg-[var(--cyra-panel)] border border-[var(--cyra-border)] hover:border-[var(--cyra-cyan)] group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="os-badge os-badge-cyan">
                    {path.experience_level || 'BEGINNER'}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">
                    {path.created_at ? new Date(path.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--cyra-text)] group-hover:text-[var(--cyra-cyan)] transition-colors line-clamp-2 font-sans">
                  {path.title}
                </h3>

                <p className="text-xs text-[var(--cyra-text-secondary)] line-clamp-2 leading-relaxed font-sans">
                  Goal: {path.goal || 'General Learning Mastery'} ({path.minutes_per_day || 30} mins/day)
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--cyra-border)] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--cyra-cyan)] font-bold">{path.progress || 60}%</span>
                  <span className="text-[10px] text-[var(--cyra-text-muted)] uppercase">MASTERY</span>
                </div>

                <span className="text-[var(--cyra-cyan)] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-bold">
                  <span>RESUME</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
