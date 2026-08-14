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

  // Let's find lessons in the DB for the learning path dca164f2-f34c-4d29-bd6e-b2406311ddfc
  const learningPathId = 'dca164f2-f34c-4d29-bd6e-b2406311ddfc';
  
  const { data: dbLessons } = await adminClient
    .from('lessons')
    .select('id, title, module_id, modules!inner(learning_path_id, module_order, title), lesson_order')
    .eq('modules.learning_path_id', learningPathId);

  console.log('\n--- Lessons in path dca164f2-f34c-4d29-bd6e-b2406311ddfc ---');
  console.log(dbLessons?.map(l => ({
    id: l.id,
    title: l.title,
    module: (l.modules as any)?.title,
    module_order: (l.modules as any)?.module_order,
    lesson_order: l.lesson_order
  })));

  // Let's query user progress
  const userId = '056aabe6-fab0-426a-a5b1-84914801769b';
  const { data: progress } = await adminClient
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);

  console.log('\n--- User progress for 056aabe6-fab0-426a-a5b1-84914801769b ---');
  console.log(progress);
}

main().catch(console.error);
