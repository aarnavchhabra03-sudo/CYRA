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
  const quizId = '4d6bd893-740f-498f-8207-af260272a426';

  console.log('\n--- Before Retake check ---');
  const { data: beforeProgress } = await adminClient.from('user_progress').select('*').eq('user_id', userId).eq('lesson_id', lessonId);
  console.log('Progress records count:', beforeProgress?.length);

  // Call the submit endpoint mock / API directly to see if it is idempotent
  const { data: prevPassedAttempt } = await adminClient
    .from('quiz_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('passed', true)
    .maybeSingle();

  const hasPassedPreviously = !!prevPassedAttempt;
  console.log('hasPassedPreviously (for XP awarding):', hasPassedPreviously);

  // Re-run upsert
  await adminClient
    .from('user_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString()
      },
      { onConflict: 'user_id,lesson_id' }
    );

  console.log('\n--- After Retake check ---');
  const { data: afterProgress } = await adminClient.from('user_progress').select('*').eq('user_id', userId).eq('lesson_id', lessonId);
  console.log('Progress records count:', afterProgress?.length);
  
  const { data: pathData } = await adminClient.from('learning_paths').select('progress').eq('id', pathId).single();
  console.log('Aggregate path progress:', pathData?.progress);
}

main().catch(console.error);
