import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/worker'
import { hashPassword } from '../src/worker/auth/password'

const password = 'ValidPassword123'
const confirmation = 'configure-cse-qa-student'

interface QaConfigureResponse {
  data: {
    target: { email: string; role: string; status: string }
    mode: 'unlocked' | 'fresh'
    accountCreated: boolean
    enrollment: { created: boolean; updated: boolean; unchanged: boolean }
    changes: {
      completionRecordsCreated: number
      completionRecordsUpdated: number
      practiceAttemptsRemoved: number
      quizAttemptsRemoved: number
      subjectAssessmentAttemptsRemoved: number
      mockExamAttemptsRemoved: number
      activeRecoveryAttemptsRemoved: number
    }
    state: { requiredLessonCount: number; completedLessonCount: number }
    verification: {
      enrollmentActive: boolean
      lessons: { total: number; accessible: number; locked: number }
      practices: { total: number; accessible: number }
      quizzes: { total: number; accessible: number }
      subjectAssessments: Array<{ available: boolean }>
      fullMockExamination: { available: boolean }
    }
  }
}

function cookieFrom(response: Response): string {
  const value = response.headers.get('set-cookie')
  if (value === null) throw new Error('Authentication cookie is missing.')
  return value.split(';')[0] ?? ''
}

function adminRequest(body: unknown, cookie: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
      'x-cse-admin-csrf': 'same-origin-admin-mutation',
    },
    body: JSON.stringify(body),
  }
}

async function createAdmin(email: string): Promise<string> {
  await env.DB.prepare(
    `INSERT INTO users (
      public_id, email, password_hash, first_name, last_name, role, status
    ) VALUES (?1, ?2, ?3, 'QA', 'Administrator', 'admin', 'active')`,
  )
    .bind(`admin-${crypto.randomUUID()}`, email, await hashPassword(password))
    .run()
  const login = await app.request(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    env,
  )
  expect(login.status).toBe(200)
  return cookieFrom(login)
}

async function createStudent(email: string): Promise<{ id: number; cookie: string }> {
  const result = await env.DB.prepare(
    `INSERT INTO users (
      public_id, email, password_hash, first_name, last_name, role, status
    ) VALUES (?1, ?2, ?3, 'Normal', 'Student', 'student', 'active')`,
  )
    .bind(`student-${crypto.randomUUID()}`, email, await hashPassword(password))
    .run()
  const id = Number(result.meta.last_row_id)
  await env.DB.prepare(
    `INSERT INTO course_enrollments (
      user_id, course_id, enrollment_status, enrollment_source
    ) VALUES (
      ?1,
      (SELECT id FROM courses WHERE slug = 'cse-professional'),
      'active',
      'admin'
    )`,
  ).bind(id).run()
  const login = await app.request(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    env,
  )
  return { id, cookie: cookieFrom(login) }
}

function configureBody(email: string, mode: 'unlocked' | 'fresh') {
  return {
    email,
    password,
    mode,
    confirmation,
    confirmNonQaEmail: false,
  }
}

async function configure(
  cookie: string,
  email: string,
  mode: 'unlocked' | 'fresh',
  overrides: Record<string, unknown> = {},
) {
  return app.request(
    '/api/admin/qa-students/configure',
    adminRequest({ ...configureBody(email, mode), ...overrides }, cookie),
    env,
  )
}

beforeAll(async () => {
  const course = await env.DB.prepare(
    "SELECT id FROM courses WHERE slug = 'cse-professional'",
  ).first<{ id: number }>()
  if (course === null) throw new Error('CSE Professional fixture is missing.')

  const subjects = [
    ['Numerical Ability', 'numerical-ability', 1],
    ['Analytical Ability', 'analytical-ability', 2],
    ['Verbal Ability', 'verbal-ability', 3],
    ['General Information', 'general-information', 4],
  ] as const
  for (const [title, slug, position] of subjects) {
    await env.DB.prepare(
      `INSERT INTO subjects (
        course_id, title, slug, position, status
      ) VALUES (?1, ?2, ?3, ?4, 'published')
      ON CONFLICT(course_id, slug) DO UPDATE SET status = 'published'`,
    ).bind(course.id, title, slug, position).run()
    const subject = await env.DB.prepare(
      'SELECT id FROM subjects WHERE course_id = ?1 AND slug = ?2',
    ).bind(course.id, slug).first<{ id: number }>()
    if (subject === null) throw new Error(`Subject fixture ${slug} is missing.`)

    if (slug !== 'numerical-ability') {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO topics (
          subject_id, title, slug, position, status
        ) VALUES (?1, ?2, ?3, 1, 'published')`,
      ).bind(subject.id, `${title} QA Topic`, `${slug}-qa-topic`).run()
      await env.DB.prepare(
        `INSERT OR IGNORE INTO lessons (
          topic_id, public_id, title, slug, lesson_type, position,
          estimated_minutes, is_preview, requires_previous, status
        ) VALUES (
          (SELECT id FROM topics WHERE subject_id = ?1 AND slug = ?2),
          ?3, ?4, ?5, 'reading', 1, 5, 0, 1, 'published'
        )`,
      ).bind(
        subject.id,
        `${slug}-qa-topic`,
        `lesson-${slug}-qa`,
        `${title} QA Lesson`,
        `${slug}-qa-lesson`,
      ).run()
    }

    await env.DB.prepare(
      `INSERT INTO subject_assessments (
        public_id, subject_id, title, slug, position, passing_score,
        question_count, status
      ) VALUES (?1, ?2, ?3, ?4, ?5, 70, 1, 'published')
      ON CONFLICT(subject_id) DO UPDATE SET status = 'published'`,
    ).bind(
      `assessment-${slug}-qa`,
      subject.id,
      `${title} Subject Assessment`,
      `${slug}-subject-assessment`,
      position,
    ).run()
  }

  const numericalAssessment = await env.DB.prepare(
    `SELECT id FROM subject_assessments
    WHERE slug = 'numerical-ability-subject-assessment'`,
  ).first<{ id: number }>()
  if (numericalAssessment === null) throw new Error('Assessment fixture is missing.')
  await env.DB.prepare(
    `INSERT OR IGNORE INTO subject_assessment_blueprints (
      assessment_id, version, total_questions, passing_score_percent
    ) VALUES (?1, 1, 1, 70)`,
  ).bind(numericalAssessment.id).run()

  await env.DB.prepare(
    `INSERT INTO mock_examinations (
      public_id, course_id, title, slug, description, simulation_label,
      position, passing_score, question_count, timed_duration_minutes,
      current_blueprint_version, status, source_url
    ) VALUES (
      'mock-cse-qa', ?1, 'Full CSE Professional Mock Examination',
      'full-cse-professional-mock-examination', 'QA fixture',
      'Platform-Designed Subject Distribution v1', 1, 80, 150, 190,
      1, 'published', 'https://www.csc.gov.ph/'
    )
    ON CONFLICT(course_id) DO UPDATE SET status = 'published'`,
  ).bind(course.id).run()
  const mock = await env.DB.prepare(
    `SELECT id FROM mock_examinations
    WHERE slug = 'full-cse-professional-mock-examination'`,
  ).first<{ id: number }>()
  if (mock === null) throw new Error('Mock fixture is missing.')
  await env.DB.prepare(
    `INSERT OR IGNORE INTO mock_exam_blueprints (
      mock_exam_id, version, label, total_questions,
      passing_score_percent, timed_duration_minutes,
      easy_count, medium_count, hard_count
    ) VALUES (?1, 1, 'QA', 150, 80, 190, 50, 50, 50)`,
  ).bind(mock.id).run()
})

describe('dedicated QA student workflow', () => {
  it('creates a normal enrolled student and unlocks every published activity through progress', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `qa-student-${crypto.randomUUID()}@example.test`
    const response = await configure(cookie, email, 'unlocked')
    const body = await response.json<QaConfigureResponse>()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      target: { email, role: 'student', status: 'active' },
      mode: 'unlocked',
      accountCreated: true,
      enrollment: { created: true },
      verification: {
        enrollmentActive: true,
        fullMockExamination: { available: true },
      },
    })
    expect(body.data.verification.lessons.accessible).toBe(
      body.data.verification.lessons.total,
    )
    expect(body.data.verification.practices.accessible).toBe(
      body.data.verification.practices.total,
    )
    expect(body.data.verification.quizzes.accessible).toBe(
      body.data.verification.quizzes.total,
    )
    expect(body.data.verification.subjectAssessments).toHaveLength(4)
    expect(
      body.data.verification.subjectAssessments.every(
        (item: { available: boolean }) => item.available,
      ),
    ).toBe(true)
    expect(body.data.state.completedLessonCount).toBe(
      body.data.state.requiredLessonCount,
    )
  })

  it('keeps unlocked enrollment and completion rows idempotent', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `qa-idempotent-${crypto.randomUUID()}@example.test`
    expect((await configure(cookie, email, 'unlocked')).status).toBe(200)
    const second = await configure(cookie, email, 'unlocked')
    const body = await second.json<QaConfigureResponse>()
    const counts = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM course_enrollments WHERE user_id = users.id) AS enrollment_count,
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = users.id) AS progress_count
      FROM users WHERE email = ?1`,
    ).bind(email).first<{ enrollment_count: number; progress_count: number }>()

    expect(second.status).toBe(200)
    expect(body.data.enrollment).toEqual({
      created: false,
      updated: false,
      unchanged: true,
    })
    expect(body.data.changes.completionRecordsCreated).toBe(0)
    expect(body.data.changes.completionRecordsUpdated).toBe(0)
    expect(counts?.enrollment_count).toBe(1)
    expect(counts?.progress_count).toBe(body.data.state.requiredLessonCount)
  })

  it('fresh mode removes only the QA learner course progress and attempts while preserving enrollment', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `qa-fresh-${crypto.randomUUID()}@example.test`
    expect((await configure(cookie, email, 'unlocked')).status).toBe(200)
    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?1')
      .bind(email).first<{ id: number }>()
    if (user === null) throw new Error('QA learner fixture is missing.')
    await env.DB.prepare(
      `INSERT INTO practice_attempts (
        public_id, practice_set_id, user_id, attempt_number, total_points
      ) VALUES (
        ?1, (SELECT id FROM practice_sets LIMIT 1), ?2, 1, 1
      )`,
    ).bind(`practice-${crypto.randomUUID()}`, user.id).run()
    await env.DB.prepare(
      `INSERT INTO quiz_attempts (
        public_id, quiz_id, user_id, attempt_number, total_points
      ) VALUES (?1, (SELECT id FROM quizzes LIMIT 1), ?2, 1, 1)`,
    ).bind(`quiz-${crypto.randomUUID()}`, user.id).run()
    await env.DB.prepare(
      `INSERT INTO subject_assessment_attempts (
        public_id, assessment_id, blueprint_id, user_id, attempt_seed,
        attempt_number, total_points
      ) VALUES (
        ?1,
        (SELECT id FROM subject_assessments WHERE slug = 'numerical-ability-subject-assessment'),
        (SELECT subject_assessment_blueprints.id FROM subject_assessment_blueprints
          INNER JOIN subject_assessments ON subject_assessments.id = subject_assessment_blueprints.assessment_id
          WHERE subject_assessments.slug = 'numerical-ability-subject-assessment' LIMIT 1),
        ?2, ?3, 1, 1
      )`,
    ).bind(`assessment-attempt-${crypto.randomUUID()}`, user.id, crypto.randomUUID()).run()
    await env.DB.prepare(
      `INSERT INTO mock_exam_attempts (
        public_id, mock_exam_id, blueprint_id, user_id, attempt_seed,
        attempt_number, mode, total_points
      ) VALUES (
        ?1,
        (SELECT id FROM mock_examinations WHERE slug = 'full-cse-professional-mock-examination'),
        (SELECT mock_exam_blueprints.id FROM mock_exam_blueprints
          INNER JOIN mock_examinations ON mock_examinations.id = mock_exam_blueprints.mock_exam_id
          WHERE mock_examinations.slug = 'full-cse-professional-mock-examination' LIMIT 1),
        ?2, ?3, 1, 'untimed', 150
      )`,
    ).bind(`mock-attempt-${crypto.randomUUID()}`, user.id, crypto.randomUUID()).run()
    await env.DB.prepare(
      `INSERT INTO recovery_attempts (
        public_id, user_id, course_id, attempt_seed, idempotency_key,
        taxonomy_version, weakness_formula_version, question_count
      ) VALUES (
        ?1, ?2, (SELECT id FROM courses WHERE slug = 'cse-professional'),
        ?3, ?4, 1, 1, 1
      )`,
    ).bind(
      `recovery-${crypto.randomUUID()}`,
      user.id,
      crypto.randomUUID(),
      crypto.randomUUID(),
    ).run()

    const response = await configure(cookie, email, 'fresh')
    const body = await response.json<QaConfigureResponse>()
    const stored = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM course_enrollments WHERE user_id = users.id) AS enrollments,
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = users.id) AS progress,
        (SELECT COUNT(*) FROM practice_attempts WHERE user_id = users.id) AS practice_attempts,
        (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = users.id) AS quiz_attempts,
        (SELECT COUNT(*) FROM subject_assessment_attempts WHERE user_id = users.id) AS assessment_attempts,
        (SELECT COUNT(*) FROM mock_exam_attempts WHERE user_id = users.id) AS mock_attempts,
        (SELECT COUNT(*) FROM recovery_attempts WHERE user_id = users.id AND status = 'in_progress') AS recovery_attempts
      FROM users WHERE id = ?1`,
    ).bind(user.id).first<Record<string, number>>()

    expect(response.status).toBe(200)
    expect(body.data.mode).toBe('fresh')
    expect(body.data.changes).toMatchObject({
      practiceAttemptsRemoved: 1,
      quizAttemptsRemoved: 1,
      subjectAssessmentAttemptsRemoved: 1,
      mockExamAttemptsRemoved: 1,
      activeRecoveryAttemptsRemoved: 1,
    })
    expect(stored).toMatchObject({
      enrollments: 1,
      progress: 0,
      practice_attempts: 0,
      quiz_attempts: 0,
      assessment_attempts: 0,
      mock_attempts: 0,
      recovery_attempts: 0,
    })
    expect(body.data.verification.lessons.locked).toBeGreaterThan(0)
  })

  it('does not change another student and leaves normal lesson locking intact', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const normalEmail = `normal-${crypto.randomUUID()}@example.test`
    const normal = await createStudent(normalEmail)
    const firstLesson = await env.DB.prepare(
      `SELECT lessons.id
      FROM lessons
      INNER JOIN topics ON topics.id = lessons.topic_id
      INNER JOIN subjects ON subjects.id = topics.subject_id
      WHERE subjects.course_id = (SELECT id FROM courses WHERE slug = 'cse-professional')
        AND subjects.status = 'published' AND topics.status = 'published'
        AND lessons.status = 'published' AND lessons.is_preview = 0
      ORDER BY subjects.position, topics.position, lessons.position LIMIT 1`,
    ).first<{ id: number }>()
    if (firstLesson === null) throw new Error('Lesson fixture is missing.')
    await env.DB.prepare(
      `INSERT INTO lesson_progress (
        user_id, lesson_id, status, started_at, completed_at, progress_percent
      ) VALUES (?1, ?2, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 100)`,
    ).bind(normal.id, firstLesson.id).run()

    const qaEmail = `qa-isolated-${crypto.randomUUID()}@example.test`
    expect((await configure(cookie, qaEmail, 'unlocked')).status).toBe(200)
    expect((await configure(cookie, qaEmail, 'fresh')).status).toBe(200)
    const normalProgress = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM lesson_progress WHERE user_id = ?1',
    ).bind(normal.id).first<{ count: number }>()
    const thirdRequired = await env.DB.prepare(
      `SELECT lessons.public_id
      FROM lessons
      INNER JOIN topics ON topics.id = lessons.topic_id
      INNER JOIN subjects ON subjects.id = topics.subject_id
      WHERE subjects.course_id = (SELECT id FROM courses WHERE slug = 'cse-professional')
        AND subjects.status = 'published' AND topics.status = 'published'
        AND lessons.status = 'published' AND lessons.is_preview = 0
      ORDER BY subjects.position, topics.position, lessons.position LIMIT 1 OFFSET 2`,
    ).first<{ public_id: string }>()
    if (thirdRequired === null) throw new Error('Locking fixture is missing.')
    const locked = await app.request(
      `/api/student/lessons/${thirdRequired.public_id}`,
      { headers: { cookie: normal.cookie } },
      env,
    )

    expect(normalProgress?.count).toBe(1)
    expect(locked.status).toBe(403)
    await expect(locked.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'LESSON_LOCKED' },
    })
  })

  it('rejects administrator targets', async () => {
    const actorCookie = await createAdmin(`qa-actor-${crypto.randomUUID()}@example.test`)
    const targetEmail = `qa-admin-target-${crypto.randomUUID()}@example.test`
    await createAdmin(targetEmail)
    const response = await configure(actorCookie, targetEmail, 'unlocked')

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'QA_STUDENT_ADMIN_REJECTED' },
    })
  })

  it('requires exact explicit confirmation for a non-QA-looking email', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `learner-${crypto.randomUUID()}@example.test`
    const rejected = await configure(cookie, email, 'unlocked')
    const accepted = await configure(cookie, email, 'unlocked', {
      confirmNonQaEmail: true,
    })

    expect(rejected.status).toBe(409)
    expect(accepted.status).toBe(200)
    await expect(rejected.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'QA_STUDENT_EMAIL_CONFIRMATION_REQUIRED' },
    })
  })
})
