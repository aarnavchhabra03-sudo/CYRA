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
  const lessonId = '9d802332-c954-476e-9488-53ef2c190896'; // What is Data Communication?

  // 1. user_progress rows
  const { data: progress } = await adminClient
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId);

  console.log('\n--- user_progress rows for target lesson ---');
  console.log(progress);

  // 2. learning_paths.progress
  const { data: pathData } = await adminClient
    .from('learning_paths')
    .select('id, title, progress')
    .eq('id', pathId)
    .single();

  console.log('\n--- learning_paths progress ---');
  console.log(pathData);

  // 3. quiz_attempts
  const { data: attempts } = await adminClient
    .from('quiz_attempts')
    .select('id, score, percentage, passed, completed_at')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .order('completed_at', { ascending: false });

  console.log('\n--- quiz_attempts for target lesson ---');
  console.log(attempts);
}

main().catch(console.error);
