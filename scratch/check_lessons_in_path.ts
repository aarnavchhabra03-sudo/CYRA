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

  const { data: dbLessons } = await adminClient
    .from('lessons')
    .select('id, title, modules!inner(id, learning_path_id, title, module_order), lesson_order')
    .eq('modules.learning_path_id', pathId);

  const sortedLessons = (dbLessons || []).sort((a, b) => {
    const aModOrder = (a.modules as any)?.module_order || 0;
    const bModOrder = (b.modules as any)?.module_order || 0;
    if (aModOrder !== bModOrder) return aModOrder - bModOrder;
    return (a.lesson_order || 0) - (b.lesson_order || 0);
  });

  const { data: progress } = await adminClient
    .from('user_progress')
    .select('lesson_id')
    .eq('user_id', userId);

  const completedSet = new Set(progress?.map(r => r.lesson_id) || []);

  console.log('\n--- Lessons and Completion Status for active user and path ---');
  sortedLessons.forEach((l, idx) => {
    console.log(`${idx + 1}. [${completedSet.has(l.id) ? 'X' : ' '}] ${l.title} (ID: ${l.id}) - Module: ${(l.modules as any)?.title}`);
  });
  console.log(`Total lessons count: ${sortedLessons.length}`);
  console.log(`Completed lessons count: ${completedSet.size}`);
}

main().catch(console.error);
