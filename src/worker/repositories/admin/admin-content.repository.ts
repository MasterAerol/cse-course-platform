import type {
  AdminCourseRow,
  AdminDashboardCountsRow,
  AdminLessonBlockRow,
  AdminLessonRow,
  AdminPracticeChoiceRow,
  AdminPracticeQuestionRow,
  AdminPracticeSetRow,
  AdminQuizChoiceRow,
  AdminQuizQuestionRow,
  AdminQuizRow,
  AdminSubjectRow,
  AdminTopicRow,
  AuditLogRow,
} from '../../types/admin/content'

export async function getAdminDashboardCounts(
  database: D1Database,
): Promise<AdminDashboardCountsRow> {
  const row = await database
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM courses) AS courses,
        (SELECT COUNT(*) FROM courses WHERE status = 'published') AS published_courses,
        (SELECT COUNT(*) FROM courses WHERE status = 'draft') AS draft_courses,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM topics) AS topics,
        (SELECT COUNT(*) FROM lessons) AS lessons,
        (SELECT COUNT(*) FROM lessons WHERE status = 'published') AS published_lessons,
        (SELECT COUNT(*) FROM practice_sets) AS practice_sets,
        (SELECT COUNT(*) FROM quizzes) AS quizzes`,
    )
    .first<AdminDashboardCountsRow>()

  if (row === null) {
    throw new Error('Admin dashboard counts could not be loaded.')
  }

  return row
}

export async function listCourses(
  database: D1Database,
): Promise<AdminCourseRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM courses
      ORDER BY title COLLATE NOCASE, id`,
    )
    .all<AdminCourseRow>()

  return result.results
}

export async function findCourseById(
  database: D1Database,
  courseId: number,
): Promise<AdminCourseRow | null> {
  return database
    .prepare('SELECT * FROM courses WHERE id = ?1 LIMIT 1')
    .bind(courseId)
    .first<AdminCourseRow>()
}

export async function findCourseBySlug(
  database: D1Database,
  slug: string,
): Promise<AdminCourseRow | null> {
  return database
    .prepare('SELECT * FROM courses WHERE slug = ?1 LIMIT 1')
    .bind(slug)
    .first<AdminCourseRow>()
}

export async function createCourseRow(
  database: D1Database,
  input: Omit<AdminCourseRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<AdminCourseRow | null> {
  return database
    .prepare(
      `INSERT INTO courses (
        public_id,
        title,
        slug,
        short_description,
        description,
        level,
        thumbnail_key,
        status,
        access_duration_days
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      RETURNING *`,
    )
    .bind(
      input.public_id,
      input.title,
      input.slug,
      input.short_description,
      input.description,
      input.level,
      input.thumbnail_key,
      input.status,
      input.access_duration_days,
    )
    .first<AdminCourseRow>()
}

export async function updateCourseRow(
  database: D1Database,
  input: AdminCourseRow,
): Promise<AdminCourseRow | null> {
  return database
    .prepare(
      `UPDATE courses
      SET
        title = ?2,
        slug = ?3,
        short_description = ?4,
        description = ?5,
        level = ?6,
        thumbnail_key = ?7,
        status = ?8,
        access_duration_days = ?9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1
      RETURNING *`,
    )
    .bind(
      input.id,
      input.title,
      input.slug,
      input.short_description,
      input.description,
      input.level,
      input.thumbnail_key,
      input.status,
      input.access_duration_days,
    )
    .first<AdminCourseRow>()
}

export async function listSubjectsForCourse(
  database: D1Database,
  courseId: number,
): Promise<AdminSubjectRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM subjects
      WHERE course_id = ?1
      ORDER BY position, id`,
    )
    .bind(courseId)
    .all<AdminSubjectRow>()

  return result.results
}

export async function findSubjectById(
  database: D1Database,
  subjectId: number,
): Promise<AdminSubjectRow | null> {
  return database
    .prepare('SELECT * FROM subjects WHERE id = ?1 LIMIT 1')
    .bind(subjectId)
    .first<AdminSubjectRow>()
}

export async function createSubjectRow(
  database: D1Database,
  input: Omit<AdminSubjectRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<AdminSubjectRow | null> {
  return database
    .prepare(
      `INSERT INTO subjects (
        course_id,
        title,
        slug,
        description,
        position,
        status,
        archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      RETURNING *`,
    )
    .bind(
      input.course_id,
      input.title,
      input.slug,
      input.description,
      input.position,
      input.status,
      input.archived_at,
    )
    .first<AdminSubjectRow>()
}

export async function updateSubjectRow(
  database: D1Database,
  input: AdminSubjectRow,
): Promise<AdminSubjectRow | null> {
  return database
    .prepare(
      `UPDATE subjects
      SET
        title = ?2,
        slug = ?3,
        description = ?4,
        position = ?5,
        status = ?6,
        archived_at = ?7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1
      RETURNING *`,
    )
    .bind(
      input.id,
      input.title,
      input.slug,
      input.description,
      input.position,
      input.status,
      input.archived_at,
    )
    .first<AdminSubjectRow>()
}

export async function listTopicsForSubject(
  database: D1Database,
  subjectId: number,
): Promise<AdminTopicRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM topics
      WHERE subject_id = ?1
      ORDER BY position, id`,
    )
    .bind(subjectId)
    .all<AdminTopicRow>()

  return result.results
}

export async function findTopicById(
  database: D1Database,
  topicId: number,
): Promise<AdminTopicRow | null> {
  return database
    .prepare('SELECT * FROM topics WHERE id = ?1 LIMIT 1')
    .bind(topicId)
    .first<AdminTopicRow>()
}

export async function createTopicRow(
  database: D1Database,
  input: Omit<AdminTopicRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<AdminTopicRow | null> {
  return database
    .prepare(
      `INSERT INTO topics (
        subject_id,
        title,
        slug,
        description,
        position,
        status,
        archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      RETURNING *`,
    )
    .bind(
      input.subject_id,
      input.title,
      input.slug,
      input.description,
      input.position,
      input.status,
      input.archived_at,
    )
    .first<AdminTopicRow>()
}

export async function updateTopicRow(
  database: D1Database,
  input: AdminTopicRow,
): Promise<AdminTopicRow | null> {
  return database
    .prepare(
      `UPDATE topics
      SET
        title = ?2,
        slug = ?3,
        description = ?4,
        position = ?5,
        status = ?6,
        archived_at = ?7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1
      RETURNING *`,
    )
    .bind(
      input.id,
      input.title,
      input.slug,
      input.description,
      input.position,
      input.status,
      input.archived_at,
    )
    .first<AdminTopicRow>()
}

export async function listLessonsForTopic(
  database: D1Database,
  topicId: number,
): Promise<AdminLessonRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM lessons
      WHERE topic_id = ?1
      ORDER BY position, id`,
    )
    .bind(topicId)
    .all<AdminLessonRow>()

  return result.results
}

export async function findLessonById(
  database: D1Database,
  lessonId: number,
): Promise<AdminLessonRow | null> {
  return database
    .prepare('SELECT * FROM lessons WHERE id = ?1 LIMIT 1')
    .bind(lessonId)
    .first<AdminLessonRow>()
}

export async function createLessonRow(
  database: D1Database,
  input: Omit<AdminLessonRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<AdminLessonRow | null> {
  return database
    .prepare(
      `INSERT INTO lessons (
        topic_id,
        public_id,
        title,
        slug,
        lesson_type,
        summary,
        estimated_minutes,
        position,
        is_preview,
        requires_previous,
        status,
        archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      RETURNING *`,
    )
    .bind(
      input.topic_id,
      input.public_id,
      input.title,
      input.slug,
      input.lesson_type,
      input.summary,
      input.estimated_minutes,
      input.position,
      input.is_preview,
      input.requires_previous,
      input.status,
      input.archived_at,
    )
    .first<AdminLessonRow>()
}

export async function updateLessonRow(
  database: D1Database,
  input: AdminLessonRow,
): Promise<AdminLessonRow | null> {
  return database
    .prepare(
      `UPDATE lessons
      SET
        title = ?2,
        slug = ?3,
        lesson_type = ?4,
        summary = ?5,
        estimated_minutes = ?6,
        position = ?7,
        is_preview = ?8,
        requires_previous = ?9,
        status = ?10,
        archived_at = ?11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1
      RETURNING *`,
    )
    .bind(
      input.id,
      input.title,
      input.slug,
      input.lesson_type,
      input.summary,
      input.estimated_minutes,
      input.position,
      input.is_preview,
      input.requires_previous,
      input.status,
      input.archived_at,
    )
    .first<AdminLessonRow>()
}

export async function getMaxPosition(
  database: D1Database,
  table: 'subjects' | 'topics' | 'lessons' | 'lesson_blocks' | 'practice_questions' | 'practice_question_choices' | 'questions' | 'question_choices',
  parentColumn: string,
  parentId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COALESCE(MAX(position), 0) AS max_position
      FROM ${table}
      WHERE ${parentColumn} = ?1`,
    )
    .bind(parentId)
    .first<{ max_position: number }>()

  return row?.max_position ?? 0
}

export async function shiftPositionsForInsert(
  database: D1Database,
  input: {
    table: 'subjects' | 'topics' | 'lessons' | 'lesson_blocks' | 'practice_questions' | 'practice_question_choices' | 'questions' | 'question_choices'
    parentColumn: string
    parentId: number
    position: number
  },
): Promise<void> {
  await database.batch([
    database
      .prepare(
        `UPDATE ${input.table}
        SET position = position + 100000
        WHERE ${input.parentColumn} = ?1
          AND position >= ?2`,
      )
      .bind(input.parentId, input.position),
    database
      .prepare(
        `UPDATE ${input.table}
        SET position = position - 99999
        WHERE ${input.parentColumn} = ?1
          AND position >= 100000`,
      )
      .bind(input.parentId),
  ])
}

export async function swapAdjacentPositions(
  database: D1Database,
  input: {
    table: 'subjects' | 'topics' | 'lessons' | 'lesson_blocks' | 'practice_questions' | 'practice_question_choices' | 'questions' | 'question_choices'
    parentColumn: string
    parentId: number
    currentId: number
    currentPosition: number
    targetId: number
    targetPosition: number
  },
): Promise<void> {
  await database.batch([
    database
      .prepare(`UPDATE ${input.table} SET position = -1 WHERE id = ?1`)
      .bind(input.currentId),
    database
      .prepare(
        `UPDATE ${input.table}
        SET position = ?2
        WHERE id = ?1
          AND ${input.parentColumn} = ?3`,
      )
      .bind(input.targetId, input.currentPosition, input.parentId),
    database
      .prepare(
        `UPDATE ${input.table}
        SET position = ?2
        WHERE id = ?1
          AND ${input.parentColumn} = ?3`,
      )
      .bind(input.currentId, input.targetPosition, input.parentId),
  ])
}

export async function findAdjacentRow(
  database: D1Database,
  input: {
    table: 'subjects' | 'topics' | 'lessons' | 'lesson_blocks' | 'practice_questions' | 'practice_question_choices' | 'questions' | 'question_choices'
    parentColumn: string
    parentId: number
    position: number
    direction: 'up' | 'down'
  },
): Promise<{ id: number; position: number } | null> {
  const operator = input.direction === 'up' ? '<' : '>'
  const order = input.direction === 'up' ? 'DESC' : 'ASC'

  return database
    .prepare(
      `SELECT id, position
      FROM ${input.table}
      WHERE ${input.parentColumn} = ?1
        AND position ${operator} ?2
      ORDER BY position ${order}, id ${order}
      LIMIT 1`,
    )
    .bind(input.parentId, input.position)
    .first<{ id: number; position: number }>()
}

export async function listLessonBlocksForLesson(
  database: D1Database,
  lessonId: number,
): Promise<AdminLessonBlockRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM lesson_blocks
      WHERE lesson_id = ?1
      ORDER BY position, id`,
    )
    .bind(lessonId)
    .all<AdminLessonBlockRow>()

  return result.results
}

export async function findLessonBlockById(
  database: D1Database,
  blockId: number,
): Promise<AdminLessonBlockRow | null> {
  return database
    .prepare('SELECT * FROM lesson_blocks WHERE id = ?1 LIMIT 1')
    .bind(blockId)
    .first<AdminLessonBlockRow>()
}

export async function createLessonBlockRow(
  database: D1Database,
  input: Omit<AdminLessonBlockRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<AdminLessonBlockRow | null> {
  return database
    .prepare(
      `INSERT INTO lesson_blocks (
        lesson_id,
        block_type,
        content_json,
        position
      ) VALUES (?1, ?2, ?3, ?4)
      RETURNING *`,
    )
    .bind(input.lesson_id, input.block_type, input.content_json, input.position)
    .first<AdminLessonBlockRow>()
}

export async function updateLessonBlockRow(
  database: D1Database,
  input: AdminLessonBlockRow,
): Promise<AdminLessonBlockRow | null> {
  return database
    .prepare(
      `UPDATE lesson_blocks
      SET
        block_type = ?2,
        content_json = ?3,
        position = ?4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1
      RETURNING *`,
    )
    .bind(input.id, input.block_type, input.content_json, input.position)
    .first<AdminLessonBlockRow>()
}

export async function deleteLessonBlockRow(
  database: D1Database,
  blockId: number,
): Promise<void> {
  await database.prepare('DELETE FROM lesson_blocks WHERE id = ?1').bind(blockId).run()
}

export async function findPracticeSetByLessonId(
  database: D1Database,
  lessonId: number,
): Promise<AdminPracticeSetRow | null> {
  return database
    .prepare(
      `SELECT
        practice_sets.*,
        practice_set_generator_configs.generator_slug,
        practice_set_generator_configs.generator_version,
        practice_set_generator_configs.easy_count,
        practice_set_generator_configs.medium_count,
        practice_set_generator_configs.hard_count
      FROM practice_sets
      LEFT JOIN practice_set_generator_configs
        ON practice_set_generator_configs.practice_set_id = practice_sets.id
      WHERE practice_sets.lesson_id = ?1
      LIMIT 1`,
    )
    .bind(lessonId)
    .first<AdminPracticeSetRow>()
}

export async function findPracticeSetById(
  database: D1Database,
  practiceSetId: number,
): Promise<AdminPracticeSetRow | null> {
  return database
    .prepare(
      `SELECT
        practice_sets.*,
        practice_set_generator_configs.generator_slug,
        practice_set_generator_configs.generator_version,
        practice_set_generator_configs.easy_count,
        practice_set_generator_configs.medium_count,
        practice_set_generator_configs.hard_count
      FROM practice_sets
      LEFT JOIN practice_set_generator_configs
        ON practice_set_generator_configs.practice_set_id = practice_sets.id
      WHERE practice_sets.id = ?1
      LIMIT 1`,
    )
    .bind(practiceSetId)
    .first<AdminPracticeSetRow>()
}

export async function upsertPracticeSetRow(
  database: D1Database,
  input: Omit<AdminPracticeSetRow, 'id' | 'created_at' | 'updated_at' | 'generator_slug' | 'generator_version' | 'easy_count' | 'medium_count' | 'hard_count'>,
): Promise<AdminPracticeSetRow | null> {
  await database
    .prepare(
      `INSERT INTO practice_sets (
        lesson_id,
        title,
        instructions,
        passing_score,
        question_count,
        maximum_attempts,
        show_explanations,
        status,
        question_source,
        archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ON CONFLICT(lesson_id) DO UPDATE SET
        title = excluded.title,
        instructions = excluded.instructions,
        passing_score = excluded.passing_score,
        question_count = excluded.question_count,
        maximum_attempts = excluded.maximum_attempts,
        show_explanations = excluded.show_explanations,
        status = excluded.status,
        question_source = excluded.question_source,
        archived_at = excluded.archived_at,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      input.lesson_id,
      input.title,
      input.instructions,
      input.passing_score,
      input.question_count,
      input.maximum_attempts,
      input.show_explanations,
      input.status,
      input.question_source,
      input.archived_at,
    )
    .run()

  return findPracticeSetByLessonId(database, input.lesson_id)
}

export async function upsertPracticeGeneratorConfig(
  database: D1Database,
  input: {
    practiceSetId: number
    generatorSlug: string
    generatorVersion: number
    easyCount: number
    mediumCount: number
    hardCount: number
  },
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO practice_set_generator_configs (
        practice_set_id,
        generator_slug,
        generator_version,
        easy_count,
        medium_count,
        hard_count
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(practice_set_id) DO UPDATE SET
        generator_slug = excluded.generator_slug,
        generator_version = excluded.generator_version,
        easy_count = excluded.easy_count,
        medium_count = excluded.medium_count,
        hard_count = excluded.hard_count,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      input.practiceSetId,
      input.generatorSlug,
      input.generatorVersion,
      input.easyCount,
      input.mediumCount,
      input.hardCount,
    )
    .run()
}

export async function deletePracticeGeneratorConfig(
  database: D1Database,
  practiceSetId: number,
): Promise<void> {
  await database
    .prepare(
      'DELETE FROM practice_set_generator_configs WHERE practice_set_id = ?1',
    )
    .bind(practiceSetId)
    .run()
}

export async function listPracticeQuestions(
  database: D1Database,
  practiceSetId: number,
): Promise<AdminPracticeQuestionRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM practice_questions
      WHERE practice_set_id = ?1
      ORDER BY position, id`,
    )
    .bind(practiceSetId)
    .all<AdminPracticeQuestionRow>()

  return result.results
}

export async function findPracticeQuestionById(
  database: D1Database,
  questionId: number,
): Promise<AdminPracticeQuestionRow | null> {
  return database
    .prepare('SELECT * FROM practice_questions WHERE id = ?1 LIMIT 1')
    .bind(questionId)
    .first<AdminPracticeQuestionRow>()
}

export async function listPracticeChoices(
  database: D1Database,
  questionId: number,
): Promise<AdminPracticeChoiceRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM practice_question_choices
      WHERE question_id = ?1
      ORDER BY position, id`,
    )
    .bind(questionId)
    .all<AdminPracticeChoiceRow>()

  return result.results
}

export async function upsertPracticeQuestionWithChoices(
  database: D1Database,
  input: {
    question: Omit<AdminPracticeQuestionRow, 'id' | 'created_at' | 'updated_at'>
    questionId: number | null
    choices: Array<{
      id: number | null
      text: string
      isCorrect: 0 | 1
      position: number
    }>
  },
): Promise<AdminPracticeQuestionRow | null> {
  let questionId = input.questionId

  if (questionId === null) {
    const inserted = await database
      .prepare(
        `INSERT INTO practice_questions (
          practice_set_id,
          prompt,
          explanation,
          points,
          position,
          status
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        RETURNING *`,
      )
      .bind(
        input.question.practice_set_id,
        input.question.prompt,
        input.question.explanation,
        input.question.points,
        input.question.position,
        input.question.status,
      )
      .first<AdminPracticeQuestionRow>()

    if (inserted === null) {
      return null
    }

    questionId = inserted.id
  } else {
    await database
      .prepare(
        `UPDATE practice_questions
        SET
          prompt = ?2,
          explanation = ?3,
          points = ?4,
          position = ?5,
          status = ?6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1`,
      )
      .bind(
        questionId,
        input.question.prompt,
        input.question.explanation,
        input.question.points,
        input.question.position,
        input.question.status,
      )
      .run()
  }

  await database.batch(
    input.choices.map((choice) => {
      if (choice.id === null) {
        return database
          .prepare(
            `INSERT INTO practice_question_choices (
              question_id,
              choice_text,
              is_correct,
              position,
              updated_at
            ) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)`,
          )
          .bind(questionId, choice.text, choice.isCorrect, choice.position)
      }

      return database
        .prepare(
          `UPDATE practice_question_choices
          SET
            choice_text = ?2,
            is_correct = ?3,
            position = ?4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?1
            AND question_id = ?5`,
        )
        .bind(
          choice.id,
          choice.text,
          choice.isCorrect,
          choice.position,
          questionId,
        )
    }),
  )

  return findPracticeQuestionById(database, questionId)
}

export async function countPracticeQuestionReferences(
  database: D1Database,
  questionId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS count
      FROM practice_attempt_answers
      WHERE question_id = ?1`,
    )
    .bind(questionId)
    .first<{ count: number }>()

  return row?.count ?? 0
}

export async function findQuizByLessonId(
  database: D1Database,
  lessonId: number,
): Promise<AdminQuizRow | null> {
  return database
    .prepare('SELECT * FROM quizzes WHERE lesson_id = ?1 LIMIT 1')
    .bind(lessonId)
    .first<AdminQuizRow>()
}

export async function findAdminQuizById(
  database: D1Database,
  quizId: number,
): Promise<AdminQuizRow | null> {
  return database
    .prepare('SELECT * FROM quizzes WHERE id = ?1 LIMIT 1')
    .bind(quizId)
    .first<AdminQuizRow>()
}

export async function upsertQuizRow(
  database: D1Database,
  input: Omit<AdminQuizRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<AdminQuizRow | null> {
  if (input.lesson_id === null) {
    return null
  }

  const existing = await findQuizByLessonId(database, input.lesson_id)

  if (existing === null) {
    return database
      .prepare(
        `INSERT INTO quizzes (
          lesson_id,
          topic_id,
          title,
          description,
          quiz_type,
          passing_score,
          time_limit_minutes,
          maximum_attempts,
          shuffle_questions,
          shuffle_choices,
          show_explanations,
          status,
          archived_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        RETURNING *`,
      )
      .bind(
        input.lesson_id,
        input.topic_id,
        input.title,
        input.description,
        input.quiz_type,
        input.passing_score,
        input.time_limit_minutes,
        input.maximum_attempts,
        input.shuffle_questions,
        input.shuffle_choices,
        input.show_explanations,
        input.status,
        input.archived_at,
      )
      .first<AdminQuizRow>()
  }

  await database
    .prepare(
      `UPDATE quizzes
      SET
        topic_id = ?2,
        title = ?3,
        description = ?4,
        quiz_type = ?5,
        passing_score = ?6,
        time_limit_minutes = ?7,
        maximum_attempts = ?8,
        shuffle_questions = ?9,
        shuffle_choices = ?10,
        show_explanations = ?11,
        status = ?12,
        archived_at = ?13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1`,
    )
    .bind(
      existing.id,
      input.topic_id,
      input.title,
      input.description,
      input.quiz_type,
      input.passing_score,
      input.time_limit_minutes,
      input.maximum_attempts,
      input.shuffle_questions,
      input.shuffle_choices,
      input.show_explanations,
      input.status,
      input.archived_at,
    )
    .run()

  return findQuizByLessonId(database, input.lesson_id)
}

export async function listQuizQuestions(
  database: D1Database,
  quizId: number,
): Promise<AdminQuizQuestionRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM questions
      WHERE quiz_id = ?1
      ORDER BY position, id`,
    )
    .bind(quizId)
    .all<AdminQuizQuestionRow>()

  return result.results
}

export async function findQuizQuestionById(
  database: D1Database,
  questionId: number,
): Promise<AdminQuizQuestionRow | null> {
  return database
    .prepare('SELECT * FROM questions WHERE id = ?1 LIMIT 1')
    .bind(questionId)
    .first<AdminQuizQuestionRow>()
}

export async function listQuizChoices(
  database: D1Database,
  questionId: number,
): Promise<AdminQuizChoiceRow[]> {
  const result = await database
    .prepare(
      `SELECT *
      FROM question_choices
      WHERE question_id = ?1
      ORDER BY position, id`,
    )
    .bind(questionId)
    .all<AdminQuizChoiceRow>()

  return result.results
}

export async function upsertQuizQuestionWithChoices(
  database: D1Database,
  input: {
    question: Omit<AdminQuizQuestionRow, 'id' | 'created_at' | 'updated_at'>
    questionId: number | null
    choices: Array<{
      id: number | null
      text: string
      isCorrect: 0 | 1
      position: number
    }>
  },
): Promise<AdminQuizQuestionRow | null> {
  let questionId = input.questionId

  if (questionId === null) {
    const inserted = await database
      .prepare(
        `INSERT INTO questions (
          quiz_id,
          question_type,
          prompt,
          explanation,
          points,
          position,
          status
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        RETURNING *`,
      )
      .bind(
        input.question.quiz_id,
        input.question.question_type,
        input.question.prompt,
        input.question.explanation,
        input.question.points,
        input.question.position,
        input.question.status,
      )
      .first<AdminQuizQuestionRow>()

    if (inserted === null) {
      return null
    }

    questionId = inserted.id
  } else {
    await database
      .prepare(
        `UPDATE questions
        SET
          question_type = ?2,
          prompt = ?3,
          explanation = ?4,
          points = ?5,
          position = ?6,
          status = ?7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1`,
      )
      .bind(
        questionId,
        input.question.question_type,
        input.question.prompt,
        input.question.explanation,
        input.question.points,
        input.question.position,
        input.question.status,
      )
      .run()
  }

  await database.batch(
    input.choices.map((choice) => {
      if (choice.id === null) {
        return database
          .prepare(
            `INSERT INTO question_choices (
              question_id,
              choice_text,
              is_correct,
              position,
              updated_at
            ) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)`,
          )
          .bind(questionId, choice.text, choice.isCorrect, choice.position)
      }

      return database
        .prepare(
          `UPDATE question_choices
          SET
            choice_text = ?2,
            is_correct = ?3,
            position = ?4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?1
            AND question_id = ?5`,
        )
        .bind(
          choice.id,
          choice.text,
          choice.isCorrect,
          choice.position,
          questionId,
        )
    }),
  )

  return findQuizQuestionById(database, questionId)
}

export async function countQuizQuestionReferences(
  database: D1Database,
  questionId: number,
): Promise<number> {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS count
      FROM quiz_attempt_answers
      WHERE question_id = ?1`,
    )
    .bind(questionId)
    .first<{ count: number }>()

  return row?.count ?? 0
}

export async function insertAuditLog(
  database: D1Database,
  input: {
    actorUserId: number
    action: string
    entityType: string
    entityId: string
    metadataJson: string | null
  },
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata_json
      ) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(
      input.actorUserId,
      input.action,
      input.entityType,
      input.entityId,
      input.metadataJson,
    )
    .run()
}

export async function listAuditLogs(
  database: D1Database,
  input: {
    action: string | null
    entityType: string | null
    actor: number | null
    from: string | null
    to: string | null
    limit: number
    offset: number
  },
): Promise<AuditLogRow[]> {
  const result = await database
    .prepare(
      `SELECT
        audit_logs.id,
        audit_logs.actor_user_id,
        users.email AS actor_email,
        audit_logs.action,
        audit_logs.entity_type,
        audit_logs.entity_id,
        audit_logs.metadata_json,
        audit_logs.created_at
      FROM audit_logs
      LEFT JOIN users ON users.id = audit_logs.actor_user_id
      WHERE (?1 IS NULL OR audit_logs.action = ?1)
        AND (?2 IS NULL OR audit_logs.entity_type = ?2)
        AND (?3 IS NULL OR audit_logs.actor_user_id = ?3)
        AND (?4 IS NULL OR datetime(audit_logs.created_at) >= datetime(?4))
        AND (?5 IS NULL OR datetime(audit_logs.created_at) <= datetime(?5))
      ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
      LIMIT ?6 OFFSET ?7`,
    )
    .bind(
      input.action,
      input.entityType,
      input.actor,
      input.from,
      input.to,
      input.limit,
      input.offset,
    )
    .all<AuditLogRow>()

  return result.results
}
