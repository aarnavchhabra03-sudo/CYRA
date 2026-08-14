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
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

async function main() {
  const { adminClient } = await import('../src/lib/supabase/admin');
  
  const quizId = '4d6bd893-740f-498f-8207-af260272a426';
  const { data: questions } = await adminClient
    .from('quiz_questions')
    .select('id, question_text, correct_answer, options')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });

  console.log('\n--- Questions and Correct Answers for Quiz ---');
  questions?.forEach((q, idx) => {
    console.log(`Q${idx + 1}: ${q.question_text}`);
    console.log(`Correct Answer:`, q.correct_answer);
    console.log(`Options:`, q.options);
  });
}

main().catch(console.error);
