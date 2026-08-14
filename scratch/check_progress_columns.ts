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
  
  // Try inserting/selecting from user_progress to inspect its structure
  const { data, error } = await adminClient
    .from('user_progress')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying user_progress:', error);
  } else {
    console.log('user_progress records:', data);
    // Print all columns by selecting metadata
    const { data: cols, error: colsErr } = await adminClient
      .rpc('exec_sql', { sql_query: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'user_progress\'' });
    
    if (colsErr) {
      // Try raw query or inspect keys of first record if present
      console.log('Keys of first record:', data.length > 0 ? Object.keys(data[0]) : 'No records found');
    } else {
      console.log('Columns of user_progress:', cols);
    }
  }
}

main().catch(console.error);
