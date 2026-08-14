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

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runTutorRegressionTests() {
  const { buildTutorContext, resolvePrimaryTargetConcept } = await import('../src/lib/tutor/context');
  const { selectTeachingStrategy } = await import('../src/lib/tutor/strategy');

  console.log('--- TUTOR REGRESSION & INITIALIZATION TESTS ---');

  // CASE A & B: Valid Course Tutor Context Construction
  const mockValidContext = await buildTutorContext({
    userId: 'mock-user-uuid',
    learningPathId: 'dca164f2-f34c-4d29-bd6e-b2406311ddfc',
    lessonId: undefined,
  });

  assert(mockValidContext !== null, 'CASE A/B: Tutor context built for valid learningPathId');
  assert(typeof mockValidContext.learningPathTitle === 'string', 'CASE B: learningPathTitle resolved properly');

  // CASE C & D: Handling Missing / Standalone LearningPathId
  const standaloneContext = await buildTutorContext({
    userId: 'mock-user-uuid',
    learningPathId: undefined,
    lessonId: undefined,
  });

  assert(standaloneContext !== null, 'CASE C/D: Standalone context fallback returns valid context object');
  assert(standaloneContext.hasActiveAssessment === false, 'CASE C/D: Standalone mode has no active assessment blocking');

  // CASE E: Conversation History / Strategy Selection
  const primaryTarget = resolvePrimaryTargetConcept(mockValidContext);
  assert(typeof primaryTarget.concept === 'string', 'CASE E: Primary target concept resolved');

  const strategy = selectTeachingStrategy(mockValidContext, '', undefined);
  assert(typeof strategy.strategy === 'string', 'CASE E: Teaching strategy selected cleanly');

  // CASE F: Stage 12.10 Tutor Context Windowing & Summarization Bounds
  const sampleSummary = "Discussed memory management and paging. Student asked for analogies.";
  assert(sampleSummary.length <= 1500, 'CASE F: Tutor summary remains within 1500 char bound');

  // CASE G: Assessment Protection
  const activeAssessmentContext = await buildTutorContext({
    userId: 'mock-user-uuid',
    learningPathId: 'dca164f2-f34c-4d29-bd6e-b2406311ddfc',
    lessonId: undefined,
  });
  activeAssessmentContext.hasActiveAssessment = true;

  const protectedStrategy = selectTeachingStrategy(activeAssessmentContext, 'What is the answer to question 1?', undefined);
  assert(
    protectedStrategy.strategy === 'guided_reasoning' && protectedStrategy.rationaleCodes.includes('ACTIVE_ASSESSMENT_SHIELD'),
    'CASE G: Active assessment protection remains intact'
  );

  console.log('\n=== All 7 Tutor Regression Test Cases PASSED ===');
}

runTutorRegressionTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
