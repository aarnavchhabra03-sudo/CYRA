import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        process.env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  }
}

async function main() {
  const { calculateEffectiveMastery } = await import('../src/lib/adaptive/knowledge-graph');
  const { determineNextBestActionRaw } = await import('../src/lib/adaptive/orchestrator');

  let pass = 0;
  let fail = 0;

  function assert(label: string, condition: boolean) {
    if (condition) {
      console.log(`  ✅ PASS: ${label}`);
      pass++;
    } else {
      console.error(`  ❌ FAIL: ${label}`);
      fail++;
    }
  }

  // =========================================================
  // PART A: calculateEffectiveMastery unit tests
  // =========================================================
  console.log('\n--- SPACED REPETITION UNIT TESTS ---');

  // Zero-evidence: no decay regardless of age
  const zeroEvidence = calculateEffectiveMastery(80, new Date(Date.now() - 200 * 86400000).toISOString(), 0);
  assert('Zero evidence => no decay (retentionFactor = 1.00)', zeroEvidence.retentionFactor === 1.00);
  assert('Zero evidence => reviewNeeded = false', zeroEvidence.reviewNeeded === false);
  assert('Zero evidence => effectiveMasteryScore = mastery score', zeroEvidence.effectiveMasteryScore === 80);

  // 0-7 days: no decay
  const fresh = calculateEffectiveMastery(75, new Date(Date.now() - 3 * 86400000).toISOString(), 5);
  assert('0-7 days => retentionFactor = 1.00', fresh.retentionFactor === 1.00);
  assert('0-7 days => effectiveMastery = 75', fresh.effectiveMasteryScore === 75);

  // 8-21 days: mild decay
  const mild = calculateEffectiveMastery(80, new Date(Date.now() - 14 * 86400000).toISOString(), 5);
  assert('8-21 days => retentionFactor = 0.95', mild.retentionFactor === 0.95);
  assert('8-21 days => effectiveMastery = 76', mild.effectiveMasteryScore === 76);

  // 22-45 days: moderate decay
  const moderate = calculateEffectiveMastery(80, new Date(Date.now() - 30 * 86400000).toISOString(), 5);
  assert('22-45 days => retentionFactor = 0.85', moderate.retentionFactor === 0.85);
  assert('22-45 days => effectiveMastery = 68', moderate.effectiveMasteryScore === 68);

  // 46-90 days: significant decay
  const significant = calculateEffectiveMastery(80, new Date(Date.now() - 60 * 86400000).toISOString(), 5);
  assert('46-90 days => retentionFactor = 0.70', significant.retentionFactor === 0.70);
  assert('46-90 days => effectiveMastery = 56', significant.effectiveMasteryScore === 56);

  // 91-180 days: heavy decay
  const heavy = calculateEffectiveMastery(80, new Date(Date.now() - 120 * 86400000).toISOString(), 5);
  assert('91-180 days => retentionFactor = 0.55', heavy.retentionFactor === 0.55);
  assert('91-180 days => effectiveMastery = 44', heavy.effectiveMasteryScore === 44);

  // >180 days: severe decay
  const severe = calculateEffectiveMastery(80, new Date(Date.now() - 200 * 86400000).toISOString(), 5);
  assert('>180 days => retentionFactor = 0.40', severe.retentionFactor === 0.40);
  assert('>180 days => effectiveMastery = 32', severe.effectiveMasteryScore === 32);

  // Historical mastery score must remain unchanged (only effective is derived)
  const originalScore = 75;
  const calc = calculateEffectiveMastery(originalScore, new Date(Date.now() - 60 * 86400000).toISOString(), 5);
  assert('Historical masteryScore is unchanged (input not mutated)', originalScore === 75 && calc.effectiveMasteryScore !== 75);

  // =========================================================
  // PART B: Precedence Conflict Tests
  // =========================================================
  console.log('\n--- PRECEDENCE CONFLICT TESTS ---');

  function makeBase() {
    return {
      userId: 'test-user',
      learningPathId: 'test-path',
      currentLessonId: 'lesson-1',
      currentLessonTitle: 'Test Lesson',
      mastery: [] as any[],
      recommendations: [] as any[],
      adaptivePlan: [] as any[],
      rootGaps: [] as any[],
      blockedConcepts: [] as any[],
      recentQuizAttempts: [] as any[],
      recentPracticeAttempts: [] as any[],
      tutorMemories: [] as any[],
      curriculumProgress: 0,
      graphAvailable: false,
      hasActiveAssessment: false,
      learningPathConcepts: ['Concept A'],
    };
  }

  // A. Active assessment + decayed mastery => ACTIVE_ASSESSMENT_SHIELD
  const snapshotA = makeBase();
  snapshotA.hasActiveAssessment = true;
  snapshotA.mastery = [{ concept: 'Concept A', masteryScore: 80, effectiveMasteryScore: 20, daysSinceReview: 200, reviewNeeded: true, retentionFactor: 0.40, questionsAttempted: 5, questionsCorrect: 4, lastResult: 'proficient' }];
  const nbaA = determineNextBestActionRaw(snapshotA);
  assert('A: Active assessment + decay => ACTIVE_ASSESSMENT_SHIELD', nbaA.reasonCode === 'ACTIVE_ASSESSMENT_SHIELD');

  // B. Blocking prerequisite + decayed mastery => BLOCKING_PREREQUISITE
  const snapshotB = makeBase();
  snapshotB.mastery = [{ concept: 'Concept A', masteryScore: 80, effectiveMasteryScore: 15, daysSinceReview: 200, reviewNeeded: true, retentionFactor: 0.40, questionsAttempted: 5, questionsCorrect: 4, lastResult: 'proficient' }];
  snapshotB.blockedConcepts = [{ concept: 'Concept B', readinessScore: 30, blockingPrerequisites: [{ concept: 'Concept A', masteryScore: 15 }] }];
  const nbaB = determineNextBestActionRaw(snapshotB);
  assert('B: Blocking prereq + decay => BLOCKING_PREREQUISITE', nbaB.reasonCode === 'BLOCKING_PREREQUISITE');

  // C. Repeated failure + decayed mastery => REPEATED_FAILURE
  const snapshotC = makeBase();
  snapshotC.recentPracticeAttempts = [
    { concept: 'Concept A', percentage: 40, masteryBefore: 30, masteryAfter: 30, completedAt: new Date().toISOString() },
    { concept: 'Concept A', percentage: 45, masteryBefore: 30, masteryAfter: 31, completedAt: new Date().toISOString() },
  ];
  snapshotC.mastery = [{ concept: 'Concept A', masteryScore: 60, effectiveMasteryScore: 20, daysSinceReview: 200, reviewNeeded: true, retentionFactor: 0.40, questionsAttempted: 5, questionsCorrect: 3, lastResult: 'developing' }];
  const nbaC = determineNextBestActionRaw(snapshotC);
  assert('C: Repeated failure + decay => REPEATED_FAILURE or INTERVENTION_STAGNATION', nbaC.reasonCode === 'REPEATED_FAILURE' || nbaC.reasonCode === 'INTERVENTION_STAGNATION');

  // D. Active misconception + decayed mastery => ACTIVE_MISCONCEPTION
  const snapshotD = makeBase();
  snapshotD.mastery = [{ concept: 'Concept A', masteryScore: 80, effectiveMasteryScore: 20, daysSinceReview: 200, reviewNeeded: true, retentionFactor: 0.40, questionsAttempted: 5, questionsCorrect: 4, lastResult: 'proficient', lessonId: null }];
  snapshotD.tutorMemories = [{ id: 'm1', userId: 'u', concept: 'Concept A', memoryType: 'misconception', content: 'bad idea', confidence: 80, reliabilityScore: 70, occurrenceCount: 3, resolvedAt: null, relevance: 'current', lastSeenAt: '', createdAt: '' }] as any;
  const nbaD = determineNextBestActionRaw(snapshotD);
  assert('D: Active misconception + decay => ACTIVE_MISCONCEPTION', nbaD.reasonCode === 'ACTIVE_MISCONCEPTION');

  // E. Decayed mastery alone (<50 effective) => MASTERY_DECAY_PRIORITY
  const snapshotE = makeBase();
  snapshotE.mastery = [{ concept: 'Concept A', masteryScore: 80, effectiveMasteryScore: 32, daysSinceReview: 200, reviewNeeded: true, retentionFactor: 0.40, questionsAttempted: 5, questionsCorrect: 4, lastResult: 'proficient', lessonId: null }];
  snapshotE.recentQuizAttempts = [{ quizId: 'q1', lessonId: 'lesson-1', percentage: 80, completedAt: new Date().toISOString() }]; // has passing quiz so READY_FOR_ASSESSMENT won't fire first
  const nbaE = determineNextBestActionRaw(snapshotE);
  assert('E: Decayed (effective <50) alone => MASTERY_DECAY_PRIORITY', nbaE.reasonCode === 'MASTERY_DECAY_PRIORITY');

  // E2. Decayed mastery (50-84 effective, >21 days) => MASTERY_DECAY_REVIEW
  const snapshotE2 = makeBase();
  snapshotE2.mastery = [{ concept: 'Concept A', masteryScore: 80, effectiveMasteryScore: 68, daysSinceReview: 30, reviewNeeded: true, retentionFactor: 0.85, questionsAttempted: 5, questionsCorrect: 4, lastResult: 'proficient', lessonId: null }];
  snapshotE2.recentQuizAttempts = [{ quizId: 'q1', lessonId: 'lesson-1', percentage: 80, completedAt: new Date().toISOString() }];
  const nbaE2 = determineNextBestActionRaw(snapshotE2);
  assert('E2: Decayed (effective 50-84, >21 days) alone => MASTERY_DECAY_REVIEW', nbaE2.reasonCode === 'MASTERY_DECAY_REVIEW');

  // F. Zero evidence + old timestamp => no decay recommendation
  const snapshotF = makeBase();
  snapshotF.mastery = [{ concept: 'Concept A', masteryScore: 80, effectiveMasteryScore: 80, daysSinceReview: 0, reviewNeeded: false, retentionFactor: 1.00, questionsAttempted: 0, questionsCorrect: 0, lastResult: 'weak', lessonId: null }];
  snapshotF.recentQuizAttempts = [{ quizId: 'q1', lessonId: 'lesson-1', percentage: 80, completedAt: new Date().toISOString() }];
  const nbaF = determineNextBestActionRaw(snapshotF);
  assert('F: Zero evidence + old timestamp => NOT a decay recommendation', nbaF.reasonCode !== 'MASTERY_DECAY_PRIORITY' && nbaF.reasonCode !== 'MASTERY_DECAY_REVIEW');

  // G. Historical mastery unchanged after decay calc
  const originalMasteryScore = snapshotE.mastery[0].masteryScore;
  assert('G: Historical mastery score unchanged in snapshot', originalMasteryScore === 80);

  // =========================================================
  // SUMMARY
  // =========================================================
  console.log(`\n=== Stage 12.10 Test Results: ${pass} PASSED, ${fail} FAILED ===`);
  if (fail > 0) process.exit(1);
}

main().catch(console.error);
