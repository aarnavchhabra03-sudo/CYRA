import { generateLearningPathKnowledgeGraph } from '@/lib/adaptive/graph-generation';
import { LearningPathGeneration } from '@/types/ai';

export interface SaveLearningPathOptions {
  supabase: any;
  userId: string;
  curriculum: LearningPathGeneration;
  goal?: string;
  experienceLevel?: string;
  minutesPerDay?: number;
}

export interface SaveLearningPathResult {
  success: boolean;
  learningPathId?: string;
  error?: string;
  code?: string;
}

/**
 * Shared server-side function to persist a generated curriculum into database tables (learning_paths, modules, lessons)
 * and trigger non-blocking knowledge graph generation.
 */
export async function saveLearningPathCurriculum({
  supabase,
  userId,
  curriculum,
  goal,
  experienceLevel,
  minutesPerDay,
}: SaveLearningPathOptions): Promise<SaveLearningPathResult> {
  console.log(`[saveLearningPathCurriculum] Persisting path "${curriculum.title}" for user ${userId}...`);

  // Cleanup helper for partial save failures
  const cleanupPartialSave = async (pathId: string) => {
    console.warn(`[saveLearningPathCurriculum] Rolling back partial save for learning_path ${pathId}...`);
    try {
      await supabase.from('learning_paths').delete().eq('id', pathId);
      console.log(`[saveLearningPathCurriculum] Rollback complete for ${pathId}.`);
    } catch (cleanupErr) {
      console.error('[saveLearningPathCurriculum] Rollback cleanup failed:', cleanupErr);
    }
  };

  // 1. STEP A: Insert `learning_paths` record
  let learningPathId: string;
  try {
    const { data: pathRecord, error: pathError } = await supabase
      .from('learning_paths')
      .insert({
        user_id: userId,
        title: curriculum.title,
        goal: goal || 'General Learning',
        experience_level: experienceLevel || 'beginner',
        minutes_per_day: minutesPerDay || 30,
        status: 'active',
        progress: 0,
      })
      .select('id')
      .single();

    if (pathError || !pathRecord) {
      console.error(`[saveLearningPathCurriculum] ERROR in learning_paths insert:`, pathError);
      return {
        success: false,
        error: 'Failed to create learning path in database.',
        code: 'PATH_SAVE_FAILED',
      };
    }

    learningPathId = pathRecord.id;
    console.log(`[saveLearningPathCurriculum] Created learning_paths row: ${learningPathId}`);
  } catch (err: any) {
    console.error('[saveLearningPathCurriculum] Exception in learning_paths insert:', err);
    return {
      success: false,
      error: 'Database error creating learning path.',
      code: 'PATH_SAVE_FAILED',
    };
  }

  // 2. STEP B: Insert `modules` records
  try {
    const modulesToInsert = curriculum.modules.map((mod, index) => ({
      learning_path_id: learningPathId,
      title: mod.title,
      description: mod.description || '',
      module_order: mod.order || index + 1,
    }));

    const { data: insertedModules, error: modulesError } = await supabase
      .from('modules')
      .insert(modulesToInsert)
      .select('id, module_order, title');

    if (modulesError || !insertedModules || insertedModules.length !== modulesToInsert.length) {
      console.error(`[saveLearningPathCurriculum] ERROR in modules insert:`, modulesError);
      await cleanupPartialSave(learningPathId);
      return {
        success: false,
        error: 'Failed to save curriculum modules.',
        code: 'MODULE_SAVE_FAILED',
      };
    }

    console.log(`[saveLearningPathCurriculum] Inserted ${insertedModules.length} modules.`);

    // 3. STEP C: Insert `lessons` records
    const lessonsToInsert: any[] = [];
    curriculum.modules.forEach((mod) => {
      const insertedMod = insertedModules.find((m: any) => m.module_order === mod.order);
      if (insertedMod && Array.isArray(mod.lessons)) {
        mod.lessons.forEach((lesson, lIndex) => {
          lessonsToInsert.push({
            module_id: insertedMod.id,
            title: lesson.title,
            content: lesson.description
              ? `${lesson.description}${lesson.keyConcepts && lesson.keyConcepts.length > 0 ? '\n\nKey Concepts: ' + lesson.keyConcepts.join(', ') : ''}`
              : (lesson.keyConcepts ? `Key Concepts: ${lesson.keyConcepts.join(', ')}` : ''),
            estimated_minutes: lesson.estimatedMinutes || 15,
            lesson_order: lesson.order || lIndex + 1,
          });
        });
      }
    });

    if (lessonsToInsert.length > 0) {
      const { data: insertedLessons, error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessonsToInsert)
        .select('id');

      if (lessonsError || !insertedLessons || insertedLessons.length !== lessonsToInsert.length) {
        console.error(`[saveLearningPathCurriculum] ERROR in lessons insert:`, lessonsError);
        await cleanupPartialSave(learningPathId);
        return {
          success: false,
          error: 'Failed to save curriculum lessons.',
          code: 'LESSON_SAVE_FAILED',
        };
      }

      console.log(`[saveLearningPathCurriculum] Inserted ${insertedLessons.length} lessons.`);
    }

    // 4. Non-blocking trigger for knowledge graph generation
    generateLearningPathKnowledgeGraph({
      learningPathId,
      userId,
    }).catch((kgErr) => {
      console.warn('[saveLearningPathCurriculum] Non-critical graph generation warning:', kgErr);
    });

    return {
      success: true,
      learningPathId,
    };
  } catch (err: any) {
    console.error('[saveLearningPathCurriculum] Exception during modules/lessons insert:', err);
    await cleanupPartialSave(learningPathId);
    return {
      success: false,
      error: 'An unexpected database error occurred during save.',
      code: 'SAVE_FAILED',
    };
  }
}
