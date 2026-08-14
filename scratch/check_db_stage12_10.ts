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

  // Check columns on user_concept_mastery
  const { data: ucmData, error: ucmErr } = await adminClient
    .from('user_concept_mastery')
    .select('*')
    .limit(1);

  if (ucmErr) {
    console.error('Error fetching user_concept_mastery:', ucmErr);
  } else {
    console.log('Columns in user_concept_mastery:', ucmData ? Object.keys(ucmData[0] || {}) : 'empty');
  }

  // Check columns on ai_tutor_conversations
  const { data: convData, error: convErr } = await adminClient
    .from('ai_tutor_conversations')
    .select('*')
    .limit(1);

  if (convErr) {
    console.error('Error fetching ai_tutor_conversations:', convErr);
  } else {
    console.log('Columns in ai_tutor_conversations:', convData ? Object.keys(convData[0] || {}) : 'empty');
  }
}

main().catch(console.error);
