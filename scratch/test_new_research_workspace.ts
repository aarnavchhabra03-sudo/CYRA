import { DifficultyLevel } from '../src/types/ai';

interface PayloadContract {
  topic: string;
  goal: string;
  experienceLevel: DifficultyLevel;
  minutesPerDay: number;
}

const CANONICAL_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

function validatePayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  const topic = (payload.topic || '').toString().trim();
  if (topic.length < 2 || topic.length > 500) {
    return { valid: false, error: 'Topic must be between 2 and 500 characters' };
  }

  const rawLevel = (payload.experienceLevel || payload.skillLevel || payload.experience_level || '').toString().trim().toLowerCase();
  if (!CANONICAL_LEVELS.includes(rawLevel as DifficultyLevel)) {
    return { valid: false, error: 'Experience level must be beginner, intermediate, or advanced.' };
  }

  const minutes = typeof payload.minutesPerDay === 'number' && !isNaN(payload.minutesPerDay) ? payload.minutesPerDay : 30;
  if (minutes < 5 || minutes > 480) {
    return { valid: false, error: 'Daily study minutes must be between 5 and 480' };
  }

  return { valid: true };
}

console.log('===========================================================');
console.log('🧪 TESTING NEW RESEARCH WORKSPACE CONTRACT & PAYLOAD VALIDATION');
console.log('===========================================================');

const testCases = [
  {
    name: '1. Skill level: Beginner sent via experienceLevel property',
    payload: { topic: 'Quantum Computing', goal: 'deep_dive', experienceLevel: 'beginner', minutesPerDay: 30 },
  },
  {
    name: '2. Skill level: Intermediate sent via experienceLevel property',
    payload: { topic: 'Distributed Systems', goal: 'deep_dive', experienceLevel: 'intermediate', minutesPerDay: 30 },
  },
  {
    name: '3. Skill level: Advanced sent via experienceLevel property',
    payload: { topic: 'Neural Architecture Search', goal: 'deep_dive', experienceLevel: 'advanced', minutesPerDay: 30 },
  },
  {
    name: '4. Fallback normalization from skillLevel legacy field',
    payload: { topic: 'Operating Systems', goal: 'deep_dive', skillLevel: 'beginner', minutesPerDay: 30 },
  },
  {
    name: '5. Natural language research topic',
    payload: { topic: 'How do I move on from my crush', goal: 'quick_summary', experienceLevel: 'beginner', minutesPerDay: 30 },
  },
];

let allPassed = true;

for (const tc of testCases) {
  const result = validatePayload(tc.payload);
  if (result.valid) {
    console.log(`  ✅ PASS: ${tc.name}`);
  } else {
    console.error(`  ❌ FAIL: ${tc.name} — ${result.error}`);
    allPassed = false;
  }
}

console.log('===========================================================');
if (allPassed) {
  console.log('🎉 ALL NEW RESEARCH WORKSPACE CONTRACT TESTS PASSED!');
} else {
  console.error('❌ SOME TESTS FAILED!');
  process.exit(1);
}
console.log('===========================================================');
