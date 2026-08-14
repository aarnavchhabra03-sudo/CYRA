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
  
  // List users from auth schema using postgres query or admin api if available
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error('Error listing auth users:', error);
  } else {
    console.log('Auth users count:', data.users.length);
    console.log('Users emails:', data.users.map(u => ({ id: u.id, email: u.email })));
  }
}

main().catch(console.error);
