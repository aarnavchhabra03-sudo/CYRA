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
  const { data: paths } = await adminClient
    .from('learning_paths')
    .select('id, title, progress')
    .eq('user_id', userId);

  console.log('Paths for user:', paths);

  if (paths && paths.length > 0) {
    const pathId = paths[0].id;
    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id, title, modules!inner(learning_path_id)')
      .eq('modules.learning_path_id', pathId);

    console.log('Lessons for first path:', lessons?.map(l => ({ id: l.id, title: l.title })));
  }
}

main().catch(console.error);
