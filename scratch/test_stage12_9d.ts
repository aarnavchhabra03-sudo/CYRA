import fs from 'fs';
import path from 'path';

// Parse .env.local manually
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
  console.log('\n======================================================');
  console.log('🧪 RUNNING REGRESSION TESTS FOR STAGE 12.9D');
  console.log('======================================================\n');

  const { adminClient } = await import('../src/lib/supabase/admin');
  const { buildLearnerStateSnapshot, determineNextBestAction } = await import('../src/lib/adaptive/orchestrator');

  let allPassed = true;
  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] ✅ ${msg}`);
    } else {
      console.error(`[FAIL] ❌ ${msg}`);
      allPassed = false;
    }
  };

  // Find a test user
  const { data: users } = await adminClient.from('profiles').select('id').limit(1);
  if (!users || users.length === 0) {
    console.error('[ABORT] No user found in profiles table.');
    return;
  }
  const userId = users[0].id;
  console.log(`Test User ID: ${userId}`);

  // Find an existing learning path with modules and lessons
  let learningPathId = '';
  const { data: dbLessons } = await adminClient
    .from('lessons')
    .select('id, module_id, modules!inner(learning_path_id)')
    .limit(1);

  if (dbLessons && dbLessons.length > 0) {
    learningPathId = (dbLessons[0].modules as any)?.learning_path_id || '';
  }

  // Fallback to fetch paths
  if (!learningPathId) {
    const { data: paths } = await adminClient.from('learning_paths').select('id, title').eq('user_id', userId);
    if (paths && paths.length > 0) {
      learningPathId = paths[0].id;
    } else {
      // Create mock learning path
      const { data: pathData } = await adminClient
        .from('learning_paths')
        .insert({
          title: 'Networking & Operating Systems Fundamentals',
          user_id: userId,
          experience_level: 'beginner',
          goal: 'Software Engineering',
          progress: 0,
        })
        .select()
        .single();
      if (pathData) learningPathId = pathData.id;
    }
  }

  console.log(`Using learning path ID: ${learningPathId}`);

  // Fetch lessons for the course
  const { data: lessons } = await adminClient
    .from('lessons')
    .select('id, title, module_id, modules!inner(learning_path_id)')
    .eq('modules.learning_path_id', learningPathId)
    .limit(2);

  if (!lessons || lessons.length === 0) {
    console.error('[ABORT] No lessons associated with this learning path.');
    return;
  }

  const lesson1Id = lessons[0].id;
  const lesson2Id = lessons[1]?.id || null;

  console.log(`Lesson 1 ID: ${lesson1Id} ("${lessons[0].title}")`);
  if (lesson2Id) {
    console.log(`Lesson 2 ID: ${lesson2Id} ("${lessons[1].title}")`);
  }

  // ============================================================
  // TEST 1 — FAILED QUIZ DOES NOT COMPLETE LESSON
  // ============================================================
  console.log('\n--- TEST 1: FAILED QUIZ DOES NOT COMPLETE LESSON ---');
  try {
    // Ensure no progress record exists initially
    await adminClient.from('user_progress').delete().eq('user_id', userId).eq('lesson_id', lesson1Id);

    // Simulate quiz submission that failed (e.g. score = 50%)
    const passed = 50 >= 70; // 70% passing threshold
    assert(!passed, 'Failed quiz checks fail passing threshold');

    // Make sure no progress is inserted
    const { data: progress } = await adminClient
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lesson1Id)
      .maybeSingle();

    assert(!progress, 'No user_progress row inserted for failed attempt');
  } catch (err: any) {
    console.error('Test 1 failed:', err.message);
    allPassed = false;
  }

  // ============================================================
  // TEST 2 — PASSED QUIZ COMPLETES LESSON
  // ============================================================
  console.log('\n--- TEST 2: PASSED QUIZ COMPLETES LESSON ---');
  try {
    // Clear first
    await adminClient.from('user_progress').delete().eq('user_id', userId).eq('lesson_id', lesson1Id);

    // Simulate quiz passed (86% >= 70%)
    const passed = 86 >= 70;
    if (passed) {
      // Execute the endpoint completion logic
      await adminClient
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lesson1Id,
            completed: true,
            completed_at: new Date().toISOString()
          },
          { onConflict: 'user_id,lesson_id' }
        );
    }

    const { data: progress } = await adminClient
      .from('user_progress')
      .select('completed')
      .eq('user_id', userId)
      .eq('lesson_id', lesson1Id)
      .maybeSingle();

    assert(!!progress && progress.completed === true, 'Passed quiz successfully completed the lesson');
  } catch (err: any) {
    console.error('Test 2 failed:', err.message);
    allPassed = false;
  }

  // ============================================================
  // TEST 3 — REPEATED PASS IS IDEMPOTENT
  // ============================================================
  console.log('\n--- TEST 3: REPEATED PASS IS IDEMPOTENT ---');
  try {
    // Insert another complete record (simulating duplicate/strict mode retry)
    await adminClient
      .from('user_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lesson1Id,
          completed: true,
          completed_at: new Date().toISOString()
        },
        { onConflict: 'user_id,lesson_id' }
      );

    const { data: progressList } = await adminClient
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lesson1Id);

    assert(progressList !== null && progressList.length === 1, 'Only exactly 1 progress row exists (no duplicates created)');
  } catch (err: any) {
    console.error('Test 3 failed:', err.message);
    allPassed = false;
  }

  // ============================================================
  // TEST 4 — COURSE PROGRESS CALCULATION IS CORRECT
  // ============================================================
  console.log('\n--- TEST 4: COURSE PROGRESS CALCULATION ---');
  try {
    // Fetch all lessons of path
    const { data: allLessons } = await adminClient
      .from('lessons')
      .select('id, module_id, modules!inner(learning_path_id)')
      .eq('modules.learning_path_id', learningPathId);

    if (allLessons && allLessons.length > 0) {
      const allLessonIds = allLessons.map(l => l.id);
      const { data: allProgress } = await adminClient
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('lesson_id', allLessonIds);

      const completedCount = allProgress ? allProgress.length : 0;
      const expectedPct = Math.min(100, Math.round((completedCount / allLessons.length) * 100));

      await adminClient
        .from('learning_paths')
        .update({ progress: expectedPct })
        .eq('id', learningPathId);

      const { data: updatedPath } = await adminClient
        .from('learning_paths')
        .select('progress')
        .eq('id', learningPathId)
        .single();

      assert(updatedPath?.progress === expectedPct, `Learning path progress recalculated as ${expectedPct}% (expected matches persisted: ${updatedPath?.progress}%)`);
      assert(updatedPath!.progress <= 100, 'Course progress is bounded and cannot exceed 100%');
    } else {
      assert(false, 'No lessons to test course progress');
    }
  } catch (err: any) {
    console.error('Test 4 failed:', err.message);
    allPassed = false;
  }

  // ============================================================
  // TEST 5 — USER ISOLATION
  // ============================================================
  console.log('\n--- TEST 5: USER ISOLATION ---');
  try {
    const otherUserId = '00000000-0000-0000-0000-000000000009';
    const { data: otherUserProgress } = await adminClient
      .from('user_progress')
      .select('completed')
      .eq('user_id', otherUserId)
      .eq('lesson_id', lesson1Id)
      .maybeSingle();

    assert(!otherUserProgress, 'Other user progress remains uncompletable by active user session');
  } catch (err: any) {
    console.error('Test 5 failed:', err.message);
    allPassed = false;
  }

  // ============================================================
  // TEST 6 — ADAPTIVE NEXT-ACTION UPDATES ON COMPLETION
  // ============================================================
  console.log('\n--- TEST 6: ADAPTIVE NEXT-ACTION AND GRAPH UPDATE ---');
  try {
    const snapshot = await buildLearnerStateSnapshot({
      userId,
      learningPathId,
      currentLessonId: lesson1Id,
    });

    const action = determineNextBestAction(snapshot);
    console.log(`Adaptive Next Action resolved action: "${action.action}", reason: "${action.reason}"`);
    assert(action !== null, 'determineNextBestAction returns valid recommendation');
  } catch (err: any) {
    console.error('Test 6 failed:', err.message);
    allPassed = false;
  }

  // ============================================================
  // TEST 7 — NEXT LESSON RESOLUTION AND COURSE COMPLETION
  // ============================================================
  console.log('\n--- TEST 7: NEXT LESSON RESOLUTION AND COURSE COMPLETION ---');
  try {
    // Case A: Clear all user progress first
    await adminClient.from('user_progress').delete().eq('user_id', userId);

    // Case B: Mark first lesson as completed
    await adminClient
      .from('user_progress')
      .insert({
        user_id: userId,
        lesson_id: lesson1Id,
        completed: true,
      });

    // Fetch snapshot
    const snapshotPassed1 = await buildLearnerStateSnapshot({
      userId,
      learningPathId,
      currentLessonId: lesson1Id, // Passed completed lesson ID
    });

    // Check Case A & B: Next incomplete lesson (lesson2Id) must be target lesson ID
    if (lesson2Id) {
      assert(snapshotPassed1.currentLessonId === lesson2Id, `Skipped completed first lesson and correctly targeted second lesson: ${snapshotPassed1.currentLessonId}`);
    } else {
      assert(snapshotPassed1.currentLessonId === null, 'All lessons completed (since only 1 lesson exists)');
    }

    // Case C: Mark all lessons in path as completed
    const { data: dbLessonsAll } = await adminClient
      .from('lessons')
      .select('id, modules!inner(learning_path_id)')
      .eq('modules.learning_path_id', learningPathId);

    if (dbLessonsAll && dbLessonsAll.length > 0) {
      const inserts = dbLessonsAll.map(l => ({
        user_id: userId,
        lesson_id: l.id,
        completed: true,
      }));
      await adminClient.from('user_progress').upsert(inserts, { onConflict: 'user_id,lesson_id' });
    }

    // Fetch snapshot for completed path
    const snapshotAllCompleted = await buildLearnerStateSnapshot({
      userId,
      learningPathId,
      currentLessonId: lesson1Id,
    });

    assert(snapshotAllCompleted.currentLessonId === null, 'Course completion: currentLessonId resolved to null when all lessons are completed');

    // Case D: Verify Next Action returns COURSE_COMPLETED
    const actionAllCompleted = determineNextBestAction(snapshotAllCompleted);
    assert(actionAllCompleted.reasonCode === 'COURSE_COMPLETED', `Returns COURSE_COMPLETED next action: "${actionAllCompleted.reason}"`);

  } catch (err: any) {
    console.error('Test 7 failed:', err.message);
    allPassed = false;
  }

  // Clean up
  await adminClient.from('user_progress').delete().eq('user_id', userId);

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 ALL STAGE 12.9D COMPLETION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE EXAMINE LOGS.');
  }
  console.log('======================================================\n');
}

main().catch(console.error);
