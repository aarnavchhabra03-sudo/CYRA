'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Flame,
  Award,
  Target,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Zap,
  BookMarked,
  Loader2,
  GitBranch,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface ConceptMasteryRow {
  id: string;
  user_id?: string;
  concept: string;
  mastery_score: number;
  questions_attempted: number;
  questions_correct: number;
  last_result: 'weak' | 'developing' | 'proficient' | 'mastered';
  last_practiced_at: string;
}

export interface AdaptiveRecommendationUI {
  concept: string;
  masteryScore: number;
  masteryLevel: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendationType: string;
  title: string;
  reason: string;
  suggestedAction: string;
  lessonId?: string | null;
  readinessScore?: number;
  blocked?: boolean;
  blockingPrerequisites?: Array<{
    concept: string;
    masteryScore: number;
  }>;
}

export interface AdaptiveSummaryUI {
  totalConcepts: number;
  weakConcepts: number;
  developingConcepts: number;
  proficientConcepts: number;
  masteredConcepts: number;
}

export interface RootGapUI {
  concept: string;
  masteryScore: number;
  rootGapScore: number;
  affectedDownstreamConcepts: Array<{
    concept: string;
    masteryScore: number;
  }>;
  blockingCount: number;
}

interface UserStats {
  level: number;
  levelTitle: string;
  streakDays: number;
  xp: number;
  xpNextLevel: number;
}

function normalizeGraphConcept(name: string): string {
  if (!name || typeof name !== 'string') return '';

  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export default function ProgressPage() {
  const router = useRouter();

  /*
   * ============================================================
   * USER-SPECIFIC STATE
   * ============================================================
   */

  const [userStats, setUserStats] = useState<UserStats>({
    level: 1,
    levelTitle: 'Learner',
    streakDays: 0,
    xp: 0,
    xpNextLevel: 500,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  /*
   * ============================================================
   * CONCEPT MASTERY
   * ============================================================
   */

  const [masteryRecords, setMasteryRecords] = useState<
    ConceptMasteryRow[]
  >([]);

  const [loadingMastery, setLoadingMastery] = useState(true);

  /*
   * ============================================================
   * ADAPTIVE RECOMMENDATIONS
   * ============================================================
   */

  const [recommendations, setRecommendations] = useState<
    AdaptiveRecommendationUI[]
  >([]);

  const [summary, setSummary] =
    useState<AdaptiveSummaryUI | null>(null);

  const [loadingRecs, setLoadingRecs] = useState(true);

  const [recsError, setRecsError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * PRACTICE GENERATION
   * ============================================================
   */

  const [generatingConcept, setGeneratingConcept] =
    useState<string | null>(null);

  const [genError, setGenError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * OTHER ANALYTICS
   * ============================================================
   */

  const [rootGaps, setRootGaps] =
    useState<RootGapUI[]>([]);

  const [effectivenessData, setEffectivenessData] =
    useState<any | null>(null);

  const [paths, setPaths] = useState<any[]>([]);

  /*
   * ============================================================
   * FETCH ALL USER DATA
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const supabase = createClient();

      try {
        /*
         * --------------------------------------------------------
         * 1. GET CURRENT AUTHENTICATED USER
         * --------------------------------------------------------
         */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.warn(
            '[PROGRESS] No authenticated user found.'
          );

          router.replace('/login');
          return;
        }

        if (!mounted) return;

        /*
         * --------------------------------------------------------
         * 2. FETCH USER-SPECIFIC PROFILE / GAMIFICATION DATA
         * --------------------------------------------------------
         *
         * IMPORTANT:
         * We NEVER use mockUserStats here.
         *
         * Everything is associated with the authenticated
         * Supabase user ID.
         */

        setLoadingStats(true);

        try {
          const {
            data: profile,
            error: profileError,
          } = await supabase
            .from('profiles')
            .select(
              `
                xp,
                level,
                streak_days,
                level_title,
                xp_next_level
              `
            )
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            console.error(
              '[PROGRESS] Error fetching user profile stats:',
              profileError
            );

            /*
             * Brand-new accounts should start clean.
             */
            if (mounted) {
              setUserStats({
                level: 1,
                levelTitle: 'Learner',
                streakDays: 0,
                xp: 0,
                xpNextLevel: 500,
              });
            }
          } else if (profile) {
            if (mounted) {
              setUserStats({
                level:
                  typeof profile.level === 'number'
                    ? profile.level
                    : 1,

                levelTitle:
                  profile.level_title ||
                  'Learner',

                streakDays:
                  typeof profile.streak_days === 'number'
                    ? profile.streak_days
                    : 0,

                xp:
                  typeof profile.xp === 'number'
                    ? profile.xp
                    : 0,

                xpNextLevel:
                  typeof profile.xp_next_level === 'number'
                    ? profile.xp_next_level
                    : 500,
              });
            }
          } else {
            /*
             * No profile found.
             * This is treated as a fresh account.
             */
            if (mounted) {
              setUserStats({
                level: 1,
                levelTitle: 'Learner',
                streakDays: 0,
                xp: 0,
                xpNextLevel: 500,
              });
            }
          }
        } catch (profileException) {
          console.error(
            '[PROGRESS] Profile stats exception:',
            profileException
          );

          if (mounted) {
            setUserStats({
              level: 1,
              levelTitle: 'Learner',
              streakDays: 0,
              xp: 0,
              xpNextLevel: 500,
            });
          }
        } finally {
          if (mounted) {
            setLoadingStats(false);
          }
        }

        /*
         * --------------------------------------------------------
         * 3. FETCH ACTIVE LEARNING PATHS
         * --------------------------------------------------------
         */

        let activePaths: any[] = [];

        try {
          const { data: lpData, error: lpError } =
            await supabase
              .from('learning_paths')
              .select(`
                id,
                title,
                modules (
                  id,
                  lessons (
                    id,
                    title,
                    study_notes (
                      key_concepts
                    )
                  )
                )
              `);

          if (lpError) {
            console.warn(
              '[PROGRESS] Error fetching learning paths:',
              lpError
            );
          }

          if (lpData) {
            activePaths = lpData;

            if (mounted) {
              setPaths(lpData);
            }
          }
        } catch (lpErr) {
          console.warn(
            '[PROGRESS] Learning path exception:',
            lpErr
          );
        }

        /*
         * --------------------------------------------------------
         * 4. FETCH ONLY THIS USER'S CONCEPT MASTERY
         * --------------------------------------------------------
         *
         * THIS IS ONE OF THE MOST IMPORTANT FIXES.
         *
         * Before:
         *
         * .from('user_concept_mastery')
         * .select('*')
         *
         * That could return records belonging to other users.
         *
         * Now:
         *
         * .eq('user_id', user.id)
         */

        try {
          const {
            data: masteryData,
            error: masteryError,
          } = await supabase
            .from('user_concept_mastery')
            .select('*')
            .eq('user_id', user.id)
            .order('mastery_score', {
              ascending: false,
            });

          if (masteryError) {
            console.error(
              '[PROGRESS] Error fetching concept mastery:',
              masteryError
            );

            if (mounted) {
              setMasteryRecords([]);
            }
          } else if (masteryData && mounted) {
            setMasteryRecords(
              masteryData as ConceptMasteryRow[]
            );
          }
        } catch (masteryErr) {
          console.error(
            '[PROGRESS] Concept mastery exception:',
            masteryErr
          );

          if (mounted) {
            setMasteryRecords([]);
          }
        } finally {
          if (mounted) {
            setLoadingMastery(false);
          }
        }

        /*
         * --------------------------------------------------------
         * 5. FETCH ADAPTIVE RECOMMENDATIONS
         * --------------------------------------------------------
         */

        try {
          const allRecs: AdaptiveRecommendationUI[] = [];

          let combinedSummary: AdaptiveSummaryUI = {
            totalConcepts: 0,
            weakConcepts: 0,
            developingConcepts: 0,
            proficientConcepts: 0,
            masteredConcepts: 0,
          };

          for (const lp of activePaths) {
            try {
              const res = await fetch(
                `/api/adaptive/recommendations?learningPathId=${encodeURIComponent(
                  lp.id
                )}`,
                {
                  cache: 'no-store',
                }
              );

              const result = await res.json();

              if (
                res.ok &&
                result.success &&
                result.data
              ) {
                if (
                  Array.isArray(
                    result.data.recommendations
                  )
                ) {
                  allRecs.push(
                    ...result.data.recommendations
                  );
                }

                if (result.data.summary) {
                  combinedSummary.totalConcepts +=
                    result.data.summary.totalConcepts || 0;

                  combinedSummary.weakConcepts +=
                    result.data.summary.weakConcepts || 0;

                  combinedSummary.developingConcepts +=
                    result.data.summary.developingConcepts ||
                    0;

                  combinedSummary.proficientConcepts +=
                    result.data.summary.proficientConcepts ||
                    0;

                  combinedSummary.masteredConcepts +=
                    result.data.summary.masteredConcepts ||
                    0;
                }
              }
            } catch (courseErr) {
              console.warn(
                '[PROGRESS] Recommendation error for learning path:',
                lp.id,
                courseErr
              );
            }
          }

          if (mounted) {
            setRecommendations(allRecs);
            setSummary(combinedSummary);
          }
        } catch (err) {
          console.error(
            '[PROGRESS] Error fetching adaptive recommendations:',
            err
          );

          if (mounted) {
            setRecsError(
              'Could not connect to recommendation engine.'
            );
          }
        } finally {
          if (mounted) {
            setLoadingRecs(false);
          }
        }

        /*
         * --------------------------------------------------------
         * 6. INTERVENTION EFFECTIVENESS
         * --------------------------------------------------------
         */

        try {
          const effRes = await fetch(
            '/api/adaptive/intervention-effectiveness',
            {
              cache: 'no-store',
            }
          );

          const effResult = await effRes.json();

          if (
            effRes.ok &&
            effResult.success &&
            effResult.data &&
            mounted
          ) {
            setEffectivenessData(effResult.data);
          }
        } catch (effErr) {
          console.warn(
            '[PROGRESS] Error fetching intervention effectiveness:',
            effErr
          );
        }

        /*
         * --------------------------------------------------------
         * 7. ROOT KNOWLEDGE GAPS
         * --------------------------------------------------------
         *
         * Keep empty until the backend provides them.
         */

        if (mounted) {
          setRootGaps([]);
        }
      } catch (err) {
        console.error(
          '[PROGRESS] Fatal page data error:',
          err
        );

        if (mounted) {
          setLoadingStats(false);
          setLoadingMastery(false);
          setLoadingRecs(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [router]);

  /*
   * ============================================================
   * MAP CONCEPTS -> COURSES
   * ============================================================
   */

  const conceptToCourseMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const lp of paths) {
      if (!lp.modules) continue;

      for (const mod of lp.modules) {
        if (!mod.lessons) continue;

        for (const lesson of mod.lessons) {
          if (lesson.title) {
            map.set(
              normalizeGraphConcept(lesson.title),
              lp.title
            );
          }

          const notesList = lesson.study_notes;

          const notes = Array.isArray(notesList)
            ? notesList[0]
            : notesList;

          if (
            notes &&
            Array.isArray(notes.key_concepts)
          ) {
            for (const concept of notes.key_concepts) {
              if (
                concept &&
                typeof concept === 'string'
              ) {
                map.set(
                  normalizeGraphConcept(concept),
                  lp.title
                );
              }
            }
          }
        }
      }
    }

    return map;
  }, [paths]);

  /*
   * ============================================================
   * GROUP USER MASTERY BY COURSE
   * ============================================================
   */

  const groupedMastery = useMemo(() => {
    const groups = new Map<
      string,
      ConceptMasteryRow[]
    >();

    for (const record of masteryRecords) {
      const normalized = normalizeGraphConcept(
        record.concept
      );

      const course =
        conceptToCourseMap.get(normalized) ||
        'Other Course Concepts';

      const list = groups.get(course) || [];

      list.push(record);

      groups.set(course, list);
    }

    return groups;
  }, [masteryRecords, conceptToCourseMap]);

  /*
   * ============================================================
   * GROUP RECOMMENDATIONS BY COURSE
   * ============================================================
   */

  const groupedRecs = useMemo(() => {
    const groups = new Map<
      string,
      AdaptiveRecommendationUI[]
    >();

    for (const rec of recommendations) {
      const normalized = normalizeGraphConcept(
        rec.concept
      );

      const course =
        conceptToCourseMap.get(normalized) ||
        'Other Course Concepts';

      const list = groups.get(course) || [];

      list.push(rec);

      groups.set(course, list);
    }

    return groups;
  }, [recommendations, conceptToCourseMap]);

  /*
   * ============================================================
   * START PRACTICE
   * ============================================================
   */

  const handleStartPractice = async (
    concept: string,
    lessonId: string
  ) => {
    if (generatingConcept) return;

    setGeneratingConcept(concept);
    setGenError(null);

    try {
      const res = await fetch(
        '/api/adaptive/practice/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            concept,
            lessonId,
          }),
        }
      );

      const result = await res.json();

      if (
        !res.ok ||
        !result.success ||
        !result.data?.sessionId
      ) {
        throw new Error(
          result.error ||
            'Failed to generate practice session.'
        );
      }

      router.push(
        `/practice/${result.data.sessionId}`
      );
    } catch (err: any) {
      console.error(
        '[PROGRESS] Practice generation error:',
        err
      );

      setGenError(
        err.message ||
          'Could not generate targeted practice.'
      );

      setGeneratingConcept(null);
    }
  };

  /*
   * ============================================================
   * USER-SPECIFIC STATS
   * ============================================================
   */

  const statsList = [
    {
      label: 'Current level',
      value: userStats.level,
      sub: userStats.levelTitle,
      color: 'text-indigo-400',
      icon: Award,
    },
    {
      label: 'Study streak',
      value: `${userStats.streakDays} Days`,
      sub:
        userStats.streakDays > 0
          ? 'Active Streak'
          : 'Start your streak',
      color: 'text-amber-500',
      icon: Flame,
    },
    {
      label: 'XP accumulated',
      value: `${userStats.xp} XP`,
      sub: `Next tier: ${userStats.xpNextLevel} XP`,
      color: 'text-cyan-400',
      icon: TrendingUp,
    },
  ];

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <div>
        <div className="flex items-center gap-2.5 text-zinc-400 mb-1">
          <Target className="w-5 h-5 text-indigo-400" />

          <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">
            Analytics Dashboard
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">
          Your Progress Profile
        </h2>

        <p className="text-xs text-zinc-400 mt-1">
          Review your current standing, adaptive
          recommendations, and learning analytics.
        </p>
      </div>

      {/* ======================================================
          USER STATS
      ======================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statsList.map((stat, idx) => {
          const Icon = stat.icon;

          return (
            <div
              key={idx}
              className="p-6 rounded-2xl glass-panel border border-zinc-900 flex flex-col justify-between space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  {stat.label}
                </span>

                <Icon
                  className={`w-5 h-5 ${stat.color}`}
                />
              </div>

              <div>
                {loadingStats ? (
                  <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {stat.value}
                    </span>

                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                      {stat.sub}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================
          CYRA LEARNING IMPACT
      ======================================================= */}

      {effectivenessData &&
        effectivenessData.totalCompletedInterventions >
          0 && (
          <div className="p-6 rounded-2xl glass-panel border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-cyan-950/10 to-zinc-950/40 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />

                CYRA Learning Impact
              </span>

              <span className="text-[9px] font-mono text-zinc-400">
                {
                  effectivenessData.totalCompletedInterventions
                }{' '}
                Interventions Measured
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {effectivenessData.mostEffectiveStrategy && (
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                    Most Effective Approach
                  </span>

                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                    {effectivenessData.mostEffectiveStrategy.strategy.replace(
                      '_',
                      ' '
                    )}
                  </h4>

                  <p className="text-xs text-emerald-400 font-semibold">
                    Average mastery gain: +
                    {
                      effectivenessData
                        .mostEffectiveStrategy
                        .averageMasteryGain
                    }
                    %
                  </p>
                </div>
              )}

              {effectivenessData.recentOutcomes &&
                effectivenessData.recentOutcomes.length >
                  0 && (
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Recent Impact
                    </span>

                    <h4 className="text-xs font-bold text-white truncate">
                      {
                        effectivenessData
                          .recentOutcomes[0].concept
                      }
                    </h4>

                    <p className="text-xs text-cyan-400 font-semibold">
                      {
                        effectivenessData
                          .recentOutcomes[0].masteryBefore
                      }
                      % →{' '}
                      {
                        effectivenessData
                          .recentOutcomes[0].masteryAfter
                      }
                      % (+
                      {
                        effectivenessData
                          .recentOutcomes[0].masteryDelta
                      }
                      %)
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

      {/* ======================================================
          ROOT KNOWLEDGE GAPS
      ======================================================= */}

      {rootGaps.length > 0 && (
        <div className="p-6 rounded-2xl glass-panel border border-amber-900/40 bg-amber-950/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-900/30 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <GitBranch className="w-4 h-4" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Root Knowledge Gaps Detected
                </h3>

                <p className="text-[11px] text-zinc-400">
                  Prerequisite concepts holding back
                  downstream learning progress.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-500/30">
              {rootGaps.length} Root Gaps
            </span>
          </div>

          <div className="space-y-3">
            {rootGaps.map((rg, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-950/80 border border-amber-900/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    {rg.concept}
                  </span>

                  <span className="text-xs font-mono font-bold text-white">
                    Mastery: {rg.masteryScore}%
                  </span>
                </div>

                {rg.affectedDownstreamConcepts.length >
                  0 && (
                  <div className="text-[11px] text-zinc-400">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block mb-1">
                      Strengthening this concept may
                      improve ({rg.blockingCount}{' '}
                      dependent concepts):
                    </span>

                    <ul className="list-disc list-inside space-y-0.5 font-mono text-[10px] text-zinc-300">
                      {rg.affectedDownstreamConcepts
                        .slice(0, 3)
                        .map((dep, dIdx) => (
                          <li key={dIdx}>
                            {dep.concept} (
                            {dep.masteryScore}% mastery)
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================
          ADAPTIVE RECOMMENDATIONS
      ======================================================= */}

      <div className="p-6 rounded-2xl glass-panel border border-zinc-800/80 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="w-4 h-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Adaptive Learning Recommendations
              </h3>

              <p className="text-[11px] text-zinc-400">
                Targeted priorities generated by
                CYRA&apos;s concept mastery and knowledge
                graph engine.
              </p>
            </div>
          </div>

          {summary && (
            <span className="text-[10px] font-mono text-zinc-400 uppercase bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
              {summary.weakConcepts +
                summary.developingConcepts}{' '}
              Action Items
            </span>
          )}
        </div>

        {genError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />

            <span>{genError}</span>
          </div>
        )}

        {loadingRecs ? (
          <div className="py-6 text-center text-xs text-zinc-500 font-mono animate-pulse">
            Calculating adaptive recommendations...
          </div>
        ) : recsError ? (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />

            <span>{recsError}</span>
          </div>
        ) : summary &&
          summary.totalConcepts === 0 ? (
          <div className="p-6 rounded-xl bg-zinc-950/40 border border-zinc-900 text-center space-y-2">
            <BookMarked className="w-6 h-6 text-indigo-400 mx-auto" />

            <p className="text-xs text-zinc-300 font-semibold">
              No Quiz Data Available
            </p>

            <p className="text-[11px] text-zinc-400">
              Complete your first quiz to unlock
              adaptive recommendations.
            </p>
          </div>
        ) : recommendations.length === 0 &&
          summary &&
          summary.masteredConcepts ===
            summary.totalConcepts ? (
          <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-center space-y-2">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />

            <p className="text-xs font-semibold text-emerald-200">
              Complete Concept Mastery
            </p>

            <p className="text-[11px] text-zinc-400">
              You&apos;re currently strong across all
              tracked concepts!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(
              groupedRecs.entries()
            ).map(([courseTitle, recs]) => {
              if (recs.length === 0) return null;

              return (
                <div
                  key={courseTitle}
                  className="space-y-3"
                >
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold pl-1">
                    Course: {courseTitle}
                  </h4>

                  <div className="space-y-3">
                    {recs.map((rec, idx) => {
                      const isBlocked =
                        rec.blocked === true;

                      const isCritical =
                        rec.priority === 'critical' ||
                        rec.priority === 'high';

                      const isMedium =
                        rec.priority === 'medium';

                      const isGeneratingThis =
                        generatingConcept ===
                        rec.concept;

                      const priorityPillClass =
                        isBlocked
                          ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 font-extrabold'
                          : isCritical
                          ? 'bg-red-950/60 border-red-500/40 text-red-300'
                          : isMedium
                          ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                          : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300';

                      return (
                        <div
                          key={idx}
                          className={`p-5 rounded-xl border space-y-3 transition-all ${
                            isBlocked
                              ? 'bg-amber-950/20 border-amber-800/40'
                              : isCritical
                              ? 'bg-red-950/10 border-red-900/30'
                              : isMedium
                              ? 'bg-amber-950/10 border-amber-900/30'
                              : 'bg-zinc-950/60 border-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span
                              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border ${priorityPillClass}`}
                            >
                              {isBlocked
                                ? 'PREREQUISITE FIRST'
                                : `${rec.priority.toUpperCase()} PRIORITY (${rec.recommendationType.toUpperCase()})`}
                            </span>

                            <span className="text-[11px] font-mono text-zinc-400">
                              <strong className="text-white">
                                {rec.masteryScore}%
                              </strong>{' '}
                              mastery ·{' '}
                              <span className="uppercase">
                                {rec.masteryLevel}
                              </span>

                              {rec.readinessScore !==
                                undefined && (
                                <span>
                                  {' '}
                                  · Readiness:{' '}
                                  <strong className="text-cyan-400">
                                    {rec.readinessScore}%
                                  </strong>
                                </span>
                              )}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-white tracking-wide">
                              {rec.concept}
                            </h4>

                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                              {rec.reason}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2 flex-wrap text-xs">
                            <span className="text-[11px] text-zinc-400 italic flex-1">
                              Action:{' '}
                              {rec.suggestedAction}
                            </span>

                            {rec.lessonId && (
                              <button
                                onClick={() =>
                                  handleStartPractice(
                                    rec.concept,
                                    rec.lessonId!
                                  )
                                }
                                disabled={
                                  !!generatingConcept
                                }
                                className="os-button-primary py-1.5 px-3 flex-shrink-0"
                              >
                                {isGeneratingThis ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />

                                    <span>
                                      Generating...
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {isBlocked
                                        ? 'Fix Prerequisite First'
                                        : 'Practice Concept'}
                                    </span>

                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================
          CONCEPT MASTERY TRACKER
      ======================================================= */}

      <div className="os-card p-6 space-y-5 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
        <div className="flex items-center justify-between border-b border-[var(--cyra-border)] pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--pastel-blue-bg)] text-[var(--cyra-cyan)] border border-[var(--cyra-border)]">
              <Sparkles className="w-4 h-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[var(--cyra-text)] tracking-wide font-mono uppercase">
                Concept Mastery Tracker
              </h3>

              <p className="text-xs text-[var(--cyra-text-secondary)] font-sans">
                Persistent analytics derived from
                your quiz attempts.
              </p>
            </div>
          </div>

          <span className="os-badge os-badge-muted">
            {masteryRecords.length} CONCEPTS TRACKED
          </span>
        </div>

        {loadingMastery ? (
          <div className="py-6 text-center text-xs text-[var(--cyra-text-muted)] font-mono animate-pulse">
            Loading concept mastery analytics...
          </div>
        ) : masteryRecords.length === 0 ? (
          <div className="os-card p-6 text-center space-y-2 bg-[var(--cyra-card)] border border-[var(--cyra-border)]">
            <BookOpen className="w-6 h-6 text-[var(--cyra-violet)] mx-auto" />

            <p className="text-xs text-[var(--cyra-text-secondary)]">
              No concept mastery records tracked
              yet.
            </p>

            <p className="text-[11px] text-[var(--cyra-text-muted)] font-mono">
              Complete an AI quiz to populate your
              personalized concept intelligence
              profile.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(
              groupedMastery.entries()
            ).map(([courseTitle, records]) => {
              if (records.length === 0) return null;

              return (
                <div
                  key={courseTitle}
                  className="space-y-3"
                >
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-[var(--cyra-cyan)] font-bold">
                    COURSE: {courseTitle}
                  </h4>

                  <div className="space-y-2">
                    {records.map((m) => {
                      const isMastered =
                        m.last_result ===
                        'mastered';

                      const isProficient =
                        m.last_result ===
                        'proficient';

                      const isDeveloping =
                        m.last_result ===
                        'developing';

                      const badgeClass =
                        isMastered
                          ? 'os-badge-emerald'
                          : isProficient
                          ? 'os-badge-cyan'
                          : isDeveloping
                          ? 'os-badge-amber'
                          : 'os-badge-rose';

                      return (
                        <div
                          key={m.id}
                          className="os-card p-4 flex items-center justify-between gap-4 bg-[var(--cyra-card)] border border-[var(--cyra-border)]"
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[var(--cyra-text)] block font-sans">
                              {m.concept}
                            </span>

                            <span className="text-[10px] font-mono text-[var(--cyra-text-muted)]">
                              {m.questions_correct} /{' '}
                              {m.questions_attempted}{' '}
                              Questions Correct
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-[var(--cyra-card-soft)] h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full ${
                                  isMastered
                                    ? 'bg-[var(--cyra-green)]'
                                    : isProficient
                                    ? 'bg-[var(--cyra-cyan)]'
                                    : isDeveloping
                                    ? 'bg-[var(--cyra-amber)]'
                                    : 'bg-[var(--cyra-red)]'
                                }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      m.mastery_score
                                    )
                                  )}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs font-mono font-bold text-[var(--cyra-text)]">
                              {m.mastery_score}%
                            </span>

                            <span
                              className={`os-badge ${badgeClass}`}
                            >
                              {m.last_result}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================
          GAMIFICATION ACHIEVEMENTS
      ======================================================= */}

      <div className="os-card p-5 space-y-3 bg-[var(--cyra-panel)] border border-[var(--cyra-border)]">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--pastel-lavender-bg)] border border-[var(--cyra-border)] text-[var(--cyra-violet)] flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-[var(--cyra-text)] uppercase">
              ADAPTIVE GAMIFIED ACHIEVEMENTS
            </h4>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
              Maintain active study streaks to earn XP
              multipliers. Mastering concepts unlocks
              customized AI quiz formats and advanced
              practice modes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
