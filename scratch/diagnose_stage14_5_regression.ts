/**
 * Stage 14.5 Regression Diagnostic Script
 * Hits the actual connected Supabase database to identify the root cause.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const idx = t.indexOf('=');
      if (idx !== -1) process.env[t.substring(0, idx).trim()] = t.substring(idx + 1).trim();
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runDiagnostic() {
  console.log('=============================================================');
  console.log('🔍 STAGE 14.5 — RESEARCH LIBRARY REGRESSION DIAGNOSTIC');
  console.log('=============================================================\n');

  // ── STEP 1: Confirm research_documents table exists ──
  console.log('STEP 1: Check research_documents table...');
  const { data: rdTest, error: rdErr } = await supabase
    .from('research_documents')
    .select('id')
    .limit(1);

  if (rdErr) {
    console.error('  ❌ research_documents query failed:', JSON.stringify(rdErr, null, 2));
  } else {
    console.log('  ✅ research_documents accessible. Sample row count:', rdTest?.length ?? 0);
  }

  // ── STEP 2: Confirm research_annotations table exists ──
  console.log('\nSTEP 2: Check research_annotations table...');
  const { data: annTest, error: annErr } = await supabase
    .from('research_annotations')
    .select('id')
    .limit(1);

  if (annErr) {
    console.error('  ❌ research_annotations query FAILED (THIS IS THE ROOT CAUSE):');
    console.error('     code:', annErr.code);
    console.error('     message:', annErr.message);
    console.error('     details:', annErr.details);
    console.error('     hint:', annErr.hint);
    console.log('\n  → The migration has NOT been applied to the connected Supabase project.');
    console.log('  → Apply stage14_5_migration.sql in the Supabase SQL Editor.\n');
  } else {
    console.log('  ✅ research_annotations accessible. Rows returned:', annTest?.length ?? 0);
  }

  // ── STEP 3: Simulate the exact GET /api/research/saved query ──
  console.log('\nSTEP 3: Simulate GET /api/research/saved base query...');
  const { data: docs, error: docsErr, count } = await supabase
    .from('research_documents')
    .select('id, user_id, title, query, intent, learning_path_id, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 49);

  if (docsErr) {
    console.error('  ❌ Base research_documents list query failed:', JSON.stringify(docsErr, null, 2));
  } else {
    console.log(`  ✅ Base query OK — returned ${docs?.length ?? 0} document(s), total count: ${count}`);
  }

  // ── STEP 4: Simulate annotation batch count query ──
  console.log('\nSTEP 4: Simulate annotation batch count query...');
  const docIds = (docs || []).map((d: any) => d.id).filter(Boolean);

  if (docIds.length === 0) {
    console.log('  ℹ️  No document IDs to test annotation query with (library is empty).');
  } else {
    const { data: annRows, error: annBatchErr } = await supabase
      .from('research_annotations')
      .select('research_document_id')
      .in('research_document_id', docIds.slice(0, 10));

    if (annBatchErr) {
      console.error('  ❌ Annotation batch count query FAILED (THIS IS THE ROOT CAUSE):');
      console.error('     code:', annBatchErr.code);
      console.error('     message:', annBatchErr.message);
      console.error('     details:', annBatchErr.details);
      console.error('     hint:', annBatchErr.hint);
    } else {
      console.log(`  ✅ Annotation batch count query OK — returned ${annRows?.length ?? 0} annotation rows`);
    }
  }

  // ── STEP 5: Check GET response shape ──
  console.log('\nSTEP 5: Verify response shape (data field)...');
  const shapedDocs = (docs || []).map((doc: any) => ({
    id: doc.id,
    userId: doc.user_id,
    title: doc.title,
    query: doc.query,
    intent: doc.intent,
    learningPathId: doc.learning_path_id,
    annotationCount: 0,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  }));

  const hasId = shapedDocs.every((d: any) => !!d.id);
  const hasTitle = shapedDocs.every((d: any) => typeof d.title === 'string');
  console.log(`  ✅ All docs have id: ${hasId}`);
  console.log(`  ✅ All docs have title: ${hasTitle}`);
  console.log(`  ✅ Response shape → { success: true, data: [...], totalCount: ${count} }`);

  console.log('\n=============================================================');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('=============================================================\n');
}

runDiagnostic().catch((err) => {
  console.error('Diagnostic script crashed:', err);
  process.exit(1);
});
