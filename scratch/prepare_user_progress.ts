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
  
  const userId = 'c78aa67e-dac4-4fe1-9380-37c5c1dbacb3'; // aarnavchhabra03@gmail.com
  const pathId = '997af597-8e65-46bd-abf9-45741f07e9bd'; // Foundations of Data Communications and Networking
  const lesson1Id = 'e1f5ac0e-1902-45ee-8bd5-98010b261716'; // Network Fundamentals
  const lesson2Id = '9d802332-c954-476e-9488-53ef2c190896'; // What is Data Communication?

  // 1. Delete progress for Lesson 2 (What is Data Communication?)
  await adminClient.from('user_progress').delete().eq('user_id', userId).eq('lesson_id', lesson2Id);

  // 2. Ensure progress for Lesson 1 (Network Fundamentals) is completed
  await adminClient.from('user_progress').upsert({
    user_id: userId,
    lesson_id: lesson1Id,
    completed: true,
  }, { onConflict: 'user_id,lesson_id' });

  // 3. Set path progress to 17%
  await adminClient.from('learning_paths').update({ progress: 17 }).eq('id', pathId);

  // 4. Find quiz for Lesson 2 and delete attempts
  const { data: quiz } = await adminClient
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lesson2Id)
    .maybeSingle();

  if (quiz) {
    await adminClient.from('quiz_attempts').delete().eq('user_id', userId).eq('quiz_id', quiz.id);
    console.log(`Deleted attempts for quiz ${quiz.id}`);
  }

  console.log('Successfully prepared user progress for browser test!');
}

main().catch(console.error);
