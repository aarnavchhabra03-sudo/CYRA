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
  const { gradeQuizSubmission } = await import('../src/lib/quiz/grading');
  const { calculateEffectiveMastery } = await import('../src/lib/adaptive/knowledge-graph');

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

  console.log('\n--- QUIZ SUBMISSION & GRADING REGRESSION TESTS ---');

  // Test 1: Grade submission with 100% score
  const mockQuestions: any[] = [
    { id: 'q1', question_type: 'multiple_choice', points: 1, correct_answer: { option_id: 'A' }, question_order: 1 },
    { id: 'q2', question_type: 'multiple_choice', points: 1, correct_answer: { option_id: 'B' }, question_order: 2 },
  ];
  const mockAnswers: any[] = [
    { questionId: 'q1', selectedAnswer: { option_id: 'A' } },
    { questionId: 'q2', selectedAnswer: { option_id: 'B' } },
  ];

  const summary1 = gradeQuizSubmission(mockQuestions, mockAnswers, 70, false);
  assert('Summary produces correct percentage (100%)', summary1.percentage === 100);
  assert('Summary passed === true', summary1.passed === true);
  assert('XP awarded on 100% first pass (30 XP)', summary1.xpAwarded === 30);
  assert('Correct answers count is 2', summary1.correctAnswers === 2);

  // Test 2: Idempotent XP on second pass
  const summary2 = gradeQuizSubmission(mockQuestions, mockAnswers, 70, true);
  assert('Zero XP awarded on previously passed quiz (idempotent)', summary2.xpAwarded === 0);

  // Test 3: Failed quiz (0%)
  const mockWrongAnswers: any[] = [
    { questionId: 'q1', selectedAnswer: { option_id: 'C' } },
    { questionId: 'q2', selectedAnswer: { option_id: 'D' } },
  ];
  const summary3 = gradeQuizSubmission(mockQuestions, mockWrongAnswers, 70, false);
  assert('Failed quiz percentage === 0', summary3.percentage === 0);
  assert('Failed quiz passed === false', summary3.passed === false);
  assert('Failed quiz base xpAwarded === 10', summary3.xpAwarded === 10);

  // Test 4: Stage 12.10 Spaced Repetition intact
  console.log('\n--- VERIFY STAGE 12.10 DECAY LOGIC INTACT ---');
  const fresh = calculateEffectiveMastery(80, new Date().toISOString(), 5);
  assert('Fresh review retains 100% effective mastery (80)', fresh.effectiveMasteryScore === 80);
  const decayed = calculateEffectiveMastery(80, new Date(Date.now() - 30 * 86400000).toISOString(), 5);
  assert('30 days review decays to factor 0.85 (effective 68)', decayed.effectiveMasteryScore === 68);

  console.log(`\n=== Quiz Regression Test Results: ${pass} PASSED, ${fail} FAILED ===`);
  if (fail > 0) process.exit(1);
}

main().catch(console.error);
