export type EnrollmentStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'completed'

export type LessonProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'

export interface CourseListRow {
  id: number
  public_id: string
  title: string
  slug: string
  short_description: string | null
  level: string | null
  thumbnail_key: string | null
  enrollment_status: EnrollmentStatus | null
  access_starts_at: string | null
  access_expires_at: string | null
  has_active_access: 0 | 1
}

export interface CourseDetailRow extends CourseListRow {
  description: string | null
}

export interface CurriculumSummaryRow {
  subject_id: number
  subject_title: string
  subject_slug: string
  subject_position: number
  topic_id: number
  topic_title: string
  topic_slug: string
  topic_position: number
  published_lesson_count: number
}

export interface CurriculumLessonRow {
  subject_id: number
  subject_title: string
  subject_slug: string
  subject_position: number
  topic_id: number
  topic_title: string
  topic_slug: string
  topic_position: number
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  lesson_position: number
  estimated_minutes: number | null
  is_preview: 0 | 1
  requires_previous: 0 | 1
  progress_status: LessonProgressStatus | null
  completed_at: string | null
}

export interface EnrollmentCourseRow {
  course_id: number
  course_public_id: string
  course_title: string
  course_slug: string
  short_description: string | null
  level: string | null
  thumbnail_key: string | null
  enrollment_status: EnrollmentStatus
  enrolled_at: string
  access_starts_at: string
  access_expires_at: string | null
  has_active_access: 0 | 1
}

export interface RequiredLessonProgressRow {
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  summary: string | null
  topic_id: number
  topic_slug: string
  subject_position: number
  topic_position: number
  lesson_position: number
  requires_previous: 0 | 1
  progress_status: LessonProgressStatus | null
  completed_at: string | null
}

export interface UserIdRow {
  id: number
}

export interface CourseIdRow {
  id: number
}

export interface EnrollmentRow {
  enrollment_status: EnrollmentStatus
  access_starts_at: string
  access_expires_at: string | null
  has_active_access: 0 | 1
}

export interface PublishedLessonDetailRow {
  lesson_id: number
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  lesson_summary: string | null
  estimated_minutes: number | null
  lesson_position: number
  is_preview: 0 | 1
  requires_previous: 0 | 1
  topic_id: number
  topic_title: string
  topic_slug: string
  topic_position: number
  subject_id: number
  subject_title: string
  subject_slug: string
  subject_position: number
  course_id: number
  course_title: string
  course_slug: string
}

export interface LessonBlockRow {
  id: number
  block_type: string
  content_json: string
  position: number
}

export interface NavigationLessonRow {
  lesson_public_id: string
  lesson_title: string
  lesson_slug: string
  lesson_type: string
  estimated_minutes: number | null
  is_preview: 0 | 1
  requires_previous: 0 | 1
  progress_status: LessonProgressStatus | null
  completed_at: string | null
  subject_position: number
  topic_position: number
  lesson_position: number
}

export interface LessonProgressRow {
  status: LessonProgressStatus
  started_at: string | null
  completed_at: string | null
  last_viewed_at: string | null
  progress_percent: number
}

const publishedCourseSelect = `courses.id,
  courses.public_id,
  courses.title,
  courses.slug,
  courses.short_description,
  courses.level,
  courses.thumbnail_key`

const enrollmentSelect = `course_enrollments.enrollment_status,
  course_enrollments.access_starts_at,
  course_enrollments.access_expires_at,
  CASE
    WHEN course_enrollments.enrollment_status = 'active'
      AND datetime(course_enrollments.access_starts_at) <= CURRENT_TIMESTAMP
      AND (
        course_enrollments.access_expires_at IS NULL
        OR datetime(course_enrollments.access_expires_at) > CURRENT_TIMESTAMP
      )
    THEN 1
    ELSE 0
  END AS has_active_access`

export async function findPublishedCourses(
  database: D1Database,
  userId: number | null,
): Promise<CourseListRow[]> {
  if (userId === null) {
    const result = await database
      .prepare(
        `SELECT
          ${publishedCourseSelect},
          NULL AS enrollment_status,
          NULL AS access_starts_at,
          NULL AS access_expires_at,
          0 AS has_active_access
        FROM courses
        WHERE courses.status = 'published'
        ORDER BY courses.title COLLATE NOCASE`,
      )
      .all<CourseListRow>()

    return result.results
  }

  const result = await database
    .prepare(
      `SELECT
        ${publishedCourseSelect},
        ${enrollmentSelect}
      FROM courses
      LEFT JOIN course_enrollments
        ON course_enrollments.course_id = courses.id
        AND course_enrollments.user_id = ?1
      WHERE courses.status = 'published'
      ORDER BY courses.title COLLATE NOCASE`,
    )
    .bind(userId)
    .all<CourseListRow>()

  return result.results
}

export async function findPublishedCourseBySlug(
  database: D1Database,
  courseSlug: string,
  userId: number | null,
): Promise<CourseDetailRow | null> {
  if (userId === null) {
    return database
      .prepare(
        `SELECT
          ${publishedCourseSelect},
          courses.description,
          NULL AS enrollment_status,
          NULL AS access_starts_at,
          NULL AS access_expires_at,
          0 AS has_active_access
        FROM courses
        WHERE courses.slug = ?1
          AND courses.status = 'published'
        LIMIT 1`,
      )
      .bind(courseSlug)
      .first<CourseDetailRow>()
  }

  return database
    .prepare(
      `SELECT
        ${publishedCourseSelect},
        courses.description,
        ${enrollmentSelect}
      FROM courses
      LEFT JOIN course_enrollments
        ON course_enrollments.course_id = courses.id
        AND course_enrollments.user_id = ?2
      WHERE courses.slug = ?1
        AND courses.status = 'published'
      LIMIT 1`,
    )
    .bind(courseSlug, userId)
    .first<CourseDetailRow>()
}

export async function findPublishedCurriculumSummary(
  database: D1Database,
  courseId: number,
): Promise<CurriculumSummaryRow[]> {
  const result = await database
    .prepare(
      `SELECT
        subjects.id AS subject_id,
        subjects.title AS subject_title,
        subjects.slug AS subject_slug,
        subjects.position AS subject_position,
        topics.id AS topic_id,
        topics.title AS topic_title,
        topics.slug AS topic_slug,
        topics.position AS topic_position,
        COUNT(lessons.id) AS published_lesson_count
      FROM subjects
      INNER JOIN topics
        ON topics.subject_id = subjects.id
        AND topics.status = 'published'
      LEFT JOIN lessons
        ON lessons.topic_id = topics.id
        AND lessons.status = 'published'
      WHERE subjects.course_id = ?1
        AND subjects.status = 'published'
      GROUP BY subjects.id, topics.id
      ORDER BY subjects.position, topics.position`,
    )
    .bind(courseId)
    .all<CurriculumSummaryRow>()

  return result.results
}

export async function findPublishedCurriculumLessons(
  database: D1Database,
  courseId: number,
  userId: number | null,
): Promise<CurriculumLessonRow[]> {
  const result = await database
    .prepare(
      `SELECT
        subjects.id AS subject_id,
        subjects.title AS subject_title,
        subjects.slug AS subject_slug,
        subjects.position AS subject_position,
        topics.id AS topic_id,
        topics.title AS topic_title,
        topics.slug AS topic_slug,
        topics.position AS topic_position,
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        lessons.position AS lesson_position,
        lessons.estimated_minutes,
        lessons.is_preview,
        lessons.requires_previous,
        lesson_progress.status AS progress_status,
        lesson_progress.completed_at
      FROM subjects
      INNER JOIN topics
        ON topics.subject_id = subjects.id
        AND topics.status = 'published'
      INNER JOIN lessons
        ON lessons.topic_id = topics.id
        AND lessons.status = 'published'
      LEFT JOIN lesson_progress
        ON lesson_progress.lesson_id = lessons.id
        AND lesson_progress.user_id = ?2
      WHERE subjects.course_id = ?1
        AND subjects.status = 'published'
      ORDER BY subjects.position, topics.position, lessons.position`,
    )
    .bind(courseId, userId)
    .all<CurriculumLessonRow>()

  return result.results
}

export async function findPublishedCourseEnrollment(
  database: D1Database,
  userId: number,
  courseSlug: string,
): Promise<EnrollmentCourseRow | null> {
  return database
    .prepare(
      `SELECT
        courses.id AS course_id,
        courses.public_id AS course_public_id,
        courses.title AS course_title,
        courses.slug AS course_slug,
        courses.short_description,
        courses.level,
        courses.thumbnail_key,
        ${enrollmentSelect},
        course_enrollments.enrolled_at
      FROM course_enrollments
      INNER JOIN courses ON courses.id = course_enrollments.course_id
      WHERE course_enrollments.user_id = ?1
        AND courses.slug = ?2
        AND courses.status = 'published'
      LIMIT 1`,
    )
    .bind(userId, courseSlug)
    .first<EnrollmentCourseRow>()
}

export async function findCourseEnrollmentById(
  database: D1Database,
  userId: number,
  courseId: number,
): Promise<EnrollmentRow | null> {
  return database
    .prepare(
      `SELECT
        ${enrollmentSelect}
      FROM course_enrollments
      WHERE user_id = ?1
        AND course_id = ?2
      LIMIT 1`,
    )
    .bind(userId, courseId)
    .first<EnrollmentRow>()
}

export async function findStudentPublishedEnrollments(
  database: D1Database,
  userId: number,
): Promise<EnrollmentCourseRow[]> {
  const result = await database
    .prepare(
      `SELECT
        courses.id AS course_id,
        courses.public_id AS course_public_id,
        courses.title AS course_title,
        courses.slug AS course_slug,
        courses.short_description,
        courses.level,
        courses.thumbnail_key,
        ${enrollmentSelect},
        course_enrollments.enrolled_at
      FROM course_enrollments
      INNER JOIN courses ON courses.id = course_enrollments.course_id
      WHERE course_enrollments.user_id = ?1
        AND courses.status = 'published'
      ORDER BY course_enrollments.enrolled_at DESC, courses.title COLLATE NOCASE`,
    )
    .bind(userId)
    .all<EnrollmentCourseRow>()

  return result.results
}

export async function findPublishedLessonByPublicId(
  database: D1Database,
  lessonPublicId: string,
): Promise<PublishedLessonDetailRow | null> {
  return database
    .prepare(
      `SELECT
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        lessons.summary AS lesson_summary,
        lessons.estimated_minutes,
        lessons.position AS lesson_position,
        lessons.requires_previous,
        lessons.is_preview,
        topics.id AS topic_id,
        topics.title AS topic_title,
        topics.slug AS topic_slug,
        topics.position AS topic_position,
        subjects.id AS subject_id,
        subjects.title AS subject_title,
        subjects.slug AS subject_slug,
        subjects.position AS subject_position,
        courses.id AS course_id,
        courses.title AS course_title,
        courses.slug AS course_slug
      FROM lessons
      INNER JOIN topics
        ON topics.id = lessons.topic_id
        AND topics.status = 'published'
      INNER JOIN subjects
        ON subjects.id = topics.subject_id
        AND subjects.status = 'published'
      INNER JOIN courses
        ON courses.id = subjects.course_id
        AND courses.status = 'published'
      WHERE lessons.public_id = ?1
        AND lessons.status = 'published'
      LIMIT 1`,
    )
    .bind(lessonPublicId)
    .first<PublishedLessonDetailRow>()
}

export async function findLessonBlocks(
  database: D1Database,
  lessonId: number,
): Promise<LessonBlockRow[]> {
  const result = await database
    .prepare(
      `SELECT
        id,
        block_type,
        content_json,
        position
      FROM lesson_blocks
      WHERE lesson_id = ?1
      ORDER BY position`,
    )
    .bind(lessonId)
    .all<LessonBlockRow>()

  return result.results
}

export async function findPublishedNavigationLessons(
  database: D1Database,
  courseId: number,
  userId: number,
): Promise<NavigationLessonRow[]> {
  const result = await database
    .prepare(
      `SELECT
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        lessons.estimated_minutes,
        lessons.is_preview,
        lessons.requires_previous,
        lesson_progress.status AS progress_status,
        lesson_progress.completed_at,
        subjects.position AS subject_position,
        topics.position AS topic_position,
        lessons.position AS lesson_position
      FROM lessons
      INNER JOIN topics
        ON topics.id = lessons.topic_id
        AND topics.status = 'published'
      INNER JOIN subjects
        ON subjects.id = topics.subject_id
        AND subjects.status = 'published'
      LEFT JOIN lesson_progress
        ON lesson_progress.lesson_id = lessons.id
        AND lesson_progress.user_id = ?2
      WHERE subjects.course_id = ?1
        AND lessons.status = 'published'
      ORDER BY subjects.position, topics.position, lessons.position`,
    )
    .bind(courseId, userId)
    .all<NavigationLessonRow>()

  return result.results
}

export async function findRequiredLessonProgressRows(
  database: D1Database,
  userId: number,
  courseId: number,
): Promise<RequiredLessonProgressRow[]> {
  const result = await database
    .prepare(
      `SELECT
        lessons.id AS lesson_id,
        lessons.public_id AS lesson_public_id,
        lessons.title AS lesson_title,
        lessons.slug AS lesson_slug,
        lessons.lesson_type,
        lessons.summary,
        topics.id AS topic_id,
        topics.slug AS topic_slug,
        subjects.position AS subject_position,
        topics.position AS topic_position,
        lessons.position AS lesson_position,
        lessons.requires_previous,
        lesson_progress.status AS progress_status,
        lesson_progress.completed_at
      FROM lessons
      INNER JOIN topics
        ON topics.id = lessons.topic_id
        AND topics.status = 'published'
      INNER JOIN subjects
        ON subjects.id = topics.subject_id
        AND subjects.status = 'published'
      LEFT JOIN lesson_progress
        ON lesson_progress.lesson_id = lessons.id
        AND lesson_progress.user_id = ?1
      WHERE subjects.course_id = ?2
        AND lessons.status = 'published'
        AND lessons.is_preview = 0
      ORDER BY subjects.position, topics.position, lessons.position`,
    )
    .bind(userId, courseId)
    .all<RequiredLessonProgressRow>()

  return result.results
}

export async function findLessonProgress(
  database: D1Database,
  userId: number,
  lessonId: number,
): Promise<LessonProgressRow | null> {
  return database
    .prepare(
      `SELECT
        status,
        started_at,
        completed_at,
        last_viewed_at,
        progress_percent
      FROM lesson_progress
      WHERE user_id = ?1
        AND lesson_id = ?2
      LIMIT 1`,
    )
    .bind(userId, lessonId)
    .first<LessonProgressRow>()
}

export async function startLessonProgress(
  database: D1Database,
  userId: number,
  lessonId: number,
): Promise<LessonProgressRow | null> {
  await database
    .prepare(
      `INSERT INTO lesson_progress (
        user_id,
        lesson_id,
        status,
        started_at,
        last_viewed_at,
        progress_percent
      ) VALUES (?1, ?2, 'in_progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET
        status = CASE
          WHEN lesson_progress.status = 'completed' THEN lesson_progress.status
          ELSE 'in_progress'
        END,
        started_at = COALESCE(lesson_progress.started_at, excluded.started_at),
        last_viewed_at = CURRENT_TIMESTAMP,
        progress_percent = CASE
          WHEN lesson_progress.status = 'completed' THEN lesson_progress.progress_percent
          ELSE lesson_progress.progress_percent
        END`,
    )
    .bind(userId, lessonId)
    .run()

  return findLessonProgress(database, userId, lessonId)
}

export async function completeLessonProgress(
  database: D1Database,
  userId: number,
  lessonId: number,
): Promise<LessonProgressRow | null> {
  await database
    .prepare(
      `UPDATE lesson_progress
      SET
        status = 'completed',
        completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
        last_viewed_at = CURRENT_TIMESTAMP,
        progress_percent = 100
      WHERE user_id = ?1
        AND lesson_id = ?2`,
    )
    .bind(userId, lessonId)
    .run()

  return findLessonProgress(database, userId, lessonId)
}

export async function findUserIdByEmail(
  database: D1Database,
  email: string,
): Promise<UserIdRow | null> {
  return database
    .prepare('SELECT id FROM users WHERE email = ?1 LIMIT 1')
    .bind(email)
    .first<UserIdRow>()
}

export async function findCourseIdBySlug(
  database: D1Database,
  courseSlug: string,
): Promise<CourseIdRow | null> {
  return database
    .prepare(
      `SELECT id
      FROM courses
      WHERE slug = ?1
        AND status = 'published'
      LIMIT 1`,
    )
    .bind(courseSlug)
    .first<CourseIdRow>()
}

export async function upsertActiveEnrollment(
  database: D1Database,
  input: {
    userId: number
    courseId: number
    accessExpiresAt: string | null
  },
): Promise<EnrollmentRow | null> {
  await database
    .prepare(
      `INSERT INTO course_enrollments (
        user_id,
        course_id,
        enrollment_status,
        access_starts_at,
        access_expires_at,
        enrollment_source
      ) VALUES (?1, ?2, 'active', CURRENT_TIMESTAMP, ?3, 'admin')
      ON CONFLICT(user_id, course_id) DO UPDATE SET
        enrollment_status = 'active',
        access_starts_at = CURRENT_TIMESTAMP,
        access_expires_at = excluded.access_expires_at,
        completed_at = NULL,
        enrollment_source = 'admin'`,
    )
    .bind(input.userId, input.courseId, input.accessExpiresAt)
    .run()

  return database
    .prepare(
      `SELECT
        ${enrollmentSelect}
      FROM course_enrollments
      WHERE user_id = ?1
        AND course_id = ?2
      LIMIT 1`,
    )
    .bind(input.userId, input.courseId)
    .first<EnrollmentRow>()
}
