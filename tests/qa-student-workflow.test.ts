import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/worker'
import { hashPassword } from '../src/worker/auth/password'

const password = 'ValidPassword123'
const confirmation = 'configure-cse-qa-student'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u


function testClientAddress(): string {
  return `2001:db8::${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

interface QaConfigureResponse {
  data: {
    target: { id: string; email: string; role: string; status: string }
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
      expectation: 'unlocked' | 'fresh' | 'inspect'
      subjects: Array<{
        slug: string
        title: string
        total: number
        accessible: number
      }>
      lessons: {
        total: number
        accessible: number
        locked: number
        requiredLocked: number
      }
      practices: { total: number; accessible: number }
      quizzes: { total: number; accessible: number }
      activities: Array<{
        subjectSlug: string
        topicSlug: string
        title: string
        activityType: 'lesson' | 'practice' | 'quiz'
        accessible: boolean
        progressStatus: string
        prerequisiteState: string
        route: string
        apiRoute: string
      }>
      lockedActivities: Array<{ title: string }>
      subjectAssessments: Array<{
        assessmentSlug: string
        title: string
        available: boolean
        route: string
      }>
      fullMockExamination: {
        slug: string | null
        available: boolean
        route: string | null
      }
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
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
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
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
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
    const assessment = await env.DB.prepare(
      `SELECT id, current_blueprint_version
      FROM subject_assessments WHERE subject_id = ?1`,
    ).bind(subject.id).first<{ id: number; current_blueprint_version: number }>()
    if (assessment === null) throw new Error(`Assessment fixture ${slug} is missing.`)
    await env.DB.prepare(
      `INSERT OR IGNORE INTO subject_assessment_blueprints (
        assessment_id, version, total_questions, passing_score_percent
      ) VALUES (?1, ?2, 1, 70)`,
    ).bind(assessment.id, assessment.current_blueprint_version).run()
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
    expect(body.data.verification.subjects.map((item) => item.slug)).toEqual([
      'numerical-ability',
      'analytical-ability',
      'verbal-ability',
      'general-information',
    ])
    expect(body.data.verification.activities.length).toBeGreaterThan(
      body.data.verification.lessons.total,
    )
    expect(body.data.verification.activities.every((item) => (
      item.accessible
      && item.title.length > 0
      && item.topicSlug.length > 0
      && item.route.length > 0
      && item.apiRoute.length > 0
      && item.prerequisiteState.length > 0
    ))).toBe(true)
    expect(body.data.verification.lockedActivities).toEqual([])

    const studentLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email, password }),
    }, env)
    expect(studentLogin.status).toBe(200)
    const studentCookie = cookieFrom(studentLogin)
    const authenticatedGets = [
      '/api/auth/me',
      '/api/student/courses/cse-professional/curriculum',
      `/api/student/mock-examinations/${body.data.verification.fullMockExamination.slug}`,
    ]
    const representativeLessons = new Map<string, string>()
    for (const activity of body.data.verification.activities) {
      if (
        activity.activityType === 'lesson'
        && !representativeLessons.has(activity.subjectSlug)
      ) {
        representativeLessons.set(activity.subjectSlug, activity.apiRoute)
      }
    }
    expect(representativeLessons.size).toBe(4)
    authenticatedGets.push(...representativeLessons.values())
    for (const route of authenticatedGets) {
      const verified = await app.request(route, {
        headers: { cookie: studentCookie },
      }, env)
      expect(verified.status, `${route}: ${await verified.clone().text()}`).toBe(200)
    }
    const me = await app.request('/api/auth/me', {
      headers: { cookie: studentCookie },
    }, env)
    await expect(me.json()).resolves.toMatchObject({
      success: true,
      data: { user: { email, role: 'student' } },
    })
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
    expect(body.data.verification.lessons.requiredLocked).toBeGreaterThan(0)
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
  it('reuses an existing student, securely resets its password, and keeps one account', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `test-${crypto.randomUUID()}@example.test`
    const student = await createStudent(email)
    await env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2')
      .bind(await hashPassword('DifferentPassword123'), student.id)
      .run()

    const response = await configure(cookie, email, 'unlocked')
    const body = await response.json<QaConfigureResponse>()
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email, password }),
    }, env)
    const users = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM users WHERE email = ?1',
    ).bind(email).first<{ count: number }>()
    const audit = await env.DB.prepare(
      `SELECT metadata_json FROM audit_logs
      WHERE action = 'qa_student.unlocked'
      ORDER BY id DESC LIMIT 1`,
    ).first<{ metadata_json: string }>()

    expect(response.status).toBe(200)
    expect(body.data.accountCreated).toBe(false)
    expect(body.data.target.role).toBe('student')
    expect(body.data.enrollment.unchanged).toBe(true)
    expect(login.status).toBe(200)
    expect(users?.count).toBe(1)
    expect(audit?.metadata_json).not.toContain(password)
    expect(audit?.metadata_json).not.toContain('passwordHash')
  })

  it('rejects missing or incorrect administrator authentication without creating the target', async () => {
    const adminEmail = `qa-admin-${crypto.randomUUID()}@example.test`
    await createAdmin(adminEmail)
    const email = `test-${crypto.randomUUID()}@example.test`
    const wrongLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email: adminEmail, password: 'WrongPassword123' }),
    }, env)
    const unauthenticated = await configure('', email, 'unlocked')
    const target = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM users WHERE email = ?1',
    ).bind(email).first<{ count: number }>()

    expect(wrongLogin.status).toBe(401)
    expect(unauthenticated.status).toBe(401)
    expect(target?.count).toBe(0)
  })

  it('inspect-only endpoint reports access without changing QA learner records', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `test-${crypto.randomUUID()}@example.test`
    expect((await configure(cookie, email, 'unlocked')).status).toBe(200)
    const before = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = users.id) AS progress,
        (SELECT COUNT(*) FROM course_enrollments WHERE user_id = users.id) AS enrollments,
        users.password_hash
      FROM users WHERE email = ?1`,
    ).bind(email).first<{ progress: number; enrollments: number; password_hash: string }>()

    const inspected = await app.request(
      `/api/admin/qa-students/target?email=${encodeURIComponent(email)}`,
      { headers: { cookie } },
      env,
    )
    const inspectedBody = await inspected.json<{
      data: {
        verification: QaConfigureResponse['data']['verification'] | null
      }
    }>()
    const after = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM lesson_progress WHERE user_id = users.id) AS progress,
        (SELECT COUNT(*) FROM course_enrollments WHERE user_id = users.id) AS enrollments,
        users.password_hash
      FROM users WHERE email = ?1`,
    ).bind(email).first<{ progress: number; enrollments: number; password_hash: string }>()

    expect(inspected.status).toBe(200)
    expect(inspectedBody.data.verification?.expectation).toBe('inspect')
    expect(inspectedBody.data.verification?.lockedActivities).toEqual([])
    expect(after).toEqual(before)
  })

  async function qaStudentRelationSnapshot(userId: number): Promise<{
    enrollmentCount: number
    progressCount: number
    completedProgressCount: number
    practiceAttemptCount: number
    quizAttemptCount: number
    subjectAssessmentAttemptCount: number
    mockExamAttemptCount: number
    recoveryAttemptCount: number
    submittedRecoveryAttemptCount: number
  }> {
    const snapshot = await env.DB
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM course_enrollments WHERE user_id = ?1) AS enrollmentCount,
          (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ?1) AS progressCount,
          (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ?1 AND status = 'completed') AS completedProgressCount,
          (SELECT COUNT(*) FROM practice_attempts WHERE user_id = ?1) AS practiceAttemptCount,
          (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?1) AS quizAttemptCount,
          (SELECT COUNT(*) FROM subject_assessment_attempts WHERE user_id = ?1) AS subjectAssessmentAttemptCount,
          (SELECT COUNT(*) FROM mock_exam_attempts WHERE user_id = ?1) AS mockExamAttemptCount,
          (SELECT COUNT(*) FROM recovery_attempts WHERE user_id = ?1) AS recoveryAttemptCount,
          (SELECT COUNT(*) FROM recovery_attempts WHERE user_id = ?1 AND status = 'submitted') AS submittedRecoveryAttemptCount
        `,
      )
      .bind(userId)
      .first<{
        enrollmentCount: number
        progressCount: number
        completedProgressCount: number
        practiceAttemptCount: number
        quizAttemptCount: number
        subjectAssessmentAttemptCount: number
        mockExamAttemptCount: number
        recoveryAttemptCount: number
        submittedRecoveryAttemptCount: number
      }>()

    if (snapshot === null) {
      throw new Error('QA student relation snapshot could not be loaded.')
    }
    return snapshot
  }
  it('creates a QA user with a UUID public identifier', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `qa-student-${crypto.randomUUID()}@example.test`
    const response = await configure(cookie, email, 'unlocked')
    const body = await response.json<QaConfigureResponse>()

    expect(response.status).toBe(200)
    expect(body.data.target.id).toMatch(uuidPattern)
  })

  it('repairs test@pasawise.com legacy publicId without changing ownership and remains idempotent', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = 'test@pasawise.com'
    const legacyPublicId = `qa-student-${crypto.randomUUID()}`
    const passwordHash = await hashPassword(password)
    const unrelatedUsersBefore = (await env.DB
      .prepare(
        `SELECT id, public_id, role, status FROM users WHERE email <> ?1 ORDER BY id`,
      )
      .bind(email)
      .all<{ id: number; public_id: string; role: string; status: string }>()).results

    const existing = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?1')
      .bind(email)
      .first<{ id: number }>()

    if (existing === null) {
      const inserted = await env.DB
        .prepare(`
          INSERT INTO users (
            public_id, email, password_hash, first_name, last_name, role, status
          ) VALUES (?1, ?2, ?3, 'CSE', 'QA Student', 'student', 'active')
        `)
        .bind(legacyPublicId, email, passwordHash)
        .run()
      const userId = Number(inserted.meta.last_row_id)
      await env.DB.prepare(`
        INSERT INTO course_enrollments (
          user_id, course_id, enrollment_status, enrollment_source
        )
        SELECT ?1, (SELECT id FROM courses WHERE slug = 'cse-professional'), 'active', 'admin'
        WHERE (SELECT id FROM courses WHERE slug = 'cse-professional') IS NOT NULL
        ON CONFLICT(user_id, course_id) DO UPDATE SET
          enrollment_status = 'active',
          access_starts_at = CURRENT_TIMESTAMP,
          access_expires_at = NULL,
          completed_at = NULL
      `)
        .bind(userId)
        .run()
    } else {
      await env.DB
        .prepare("UPDATE users SET public_id = ?1, password_hash = ?2, role = 'student', status = 'active' WHERE id = ?3")
        .bind(legacyPublicId, passwordHash, existing.id)
        .run()
      await env.DB
        .prepare('DELETE FROM lesson_progress WHERE user_id = ?1')
        .bind(existing.id)
        .run()
      await env.DB
        .prepare('DELETE FROM practice_attempts WHERE user_id = ?1')
        .bind(existing.id)
        .run()
      await env.DB
        .prepare('DELETE FROM quiz_attempts WHERE user_id = ?1')
        .bind(existing.id)
        .run()
      await env.DB
        .prepare('DELETE FROM subject_assessment_attempts WHERE user_id = ?1')
        .bind(existing.id)
        .run()
      await env.DB
        .prepare('DELETE FROM mock_exam_attempts WHERE user_id = ?1')
        .bind(existing.id)
        .run()
      await env.DB
        .prepare('DELETE FROM recovery_attempts WHERE user_id = ?1')
        .bind(existing.id)
        .run()
      await env.DB
        .prepare(`
          INSERT INTO course_enrollments (
            user_id, course_id, enrollment_status, enrollment_source
          )
          SELECT ?1, (SELECT id FROM courses WHERE slug = 'cse-professional'), 'active', 'admin'
          WHERE (SELECT id FROM courses WHERE slug = 'cse-professional') IS NOT NULL
          ON CONFLICT(user_id, course_id) DO UPDATE SET
            enrollment_status = 'active',
            access_starts_at = CURRENT_TIMESTAMP,
            access_expires_at = NULL,
            completed_at = NULL
        `)
        .bind(existing.id)
        .run()
    }

    const target = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?1')
      .bind(email)
      .first<{ id: number }>()
    if (target === null) throw new Error('Legacy QA student target is missing.')
    const userId = target.id

    const firstLesson = await env.DB
      .prepare(
        `SELECT lessons.id
         FROM lessons
         INNER JOIN topics ON topics.id = lessons.topic_id
         INNER JOIN subjects ON topics.subject_id = subjects.id
         WHERE subjects.course_id = (SELECT id FROM courses WHERE slug = 'cse-professional')
           AND subjects.status = 'published' AND topics.status = 'published'
           AND lessons.status = 'published' AND lessons.is_preview = 0
         ORDER BY subjects.position, topics.position, lessons.position
         LIMIT 1`,
      )
      .first<{ id: number }>()
    if (firstLesson === null) throw new Error('Lesson fixture is missing.')

    await env.DB
      .prepare(`
        INSERT INTO lesson_progress (
          user_id, lesson_id, status, started_at, completed_at, last_viewed_at, progress_percent
        ) VALUES (?1, ?2, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 100)
      `)
      .bind(userId, firstLesson.id)
      .run()

    const firstPracticeSet = await env.DB
      .prepare('SELECT id FROM practice_sets LIMIT 1')
      .first<{ id: number }>()
    if (firstPracticeSet !== null) {
      await env.DB.prepare(
        `INSERT INTO practice_attempts (
          public_id, practice_set_id, user_id, attempt_number, total_points
        ) VALUES (?1, ?2, ?3, 1, 1)`,
      ).bind(`practice-${crypto.randomUUID()}`, firstPracticeSet.id, userId).run()
    }

    const firstQuiz = await env.DB
      .prepare('SELECT id FROM quizzes LIMIT 1')
      .first<{ id: number }>()
    if (firstQuiz !== null) {
      await env.DB.prepare(
        `INSERT INTO quiz_attempts (
          public_id, quiz_id, user_id, attempt_number, total_points
        ) VALUES (?1, ?2, ?3, 1, 1)`,
      ).bind(`quiz-${crypto.randomUUID()}`, firstQuiz.id, userId).run()
    }

    const firstSubjectAssessment = await env.DB
      .prepare("SELECT id FROM subject_assessments WHERE slug = 'numerical-ability-subject-assessment'")
      .first<{ id: number }>()
    if (firstSubjectAssessment !== null) {
      const assessmentBlueprint = await env.DB
        .prepare(
          `SELECT id AS blueprint_id
           FROM subject_assessment_blueprints
           WHERE assessment_id = ?1
           LIMIT 1`,
        )
        .bind(firstSubjectAssessment.id)
        .first<{ blueprint_id: number }>()
      if (assessmentBlueprint !== null) {
        await env.DB.prepare(
          `INSERT INTO subject_assessment_attempts (
            public_id, assessment_id, blueprint_id, user_id, attempt_seed,
            attempt_number, total_points
          ) VALUES (?1, ?2, ?3, ?4, ?5, 1, 1)`,
        ).bind(
          `assessment-${crypto.randomUUID()}`,
          firstSubjectAssessment.id,
          assessmentBlueprint.blueprint_id,
          userId,
          crypto.randomUUID(),
        ).run()
      }
    }

    const mockExam = await env.DB
      .prepare("SELECT id FROM mock_examinations WHERE slug = 'full-cse-professional-mock-examination'")
      .first<{ id: number }>()
    if (mockExam !== null) {
      const mockBlueprint = await env.DB
        .prepare(
          `SELECT id AS blueprint_id
           FROM mock_exam_blueprints
           WHERE mock_exam_id = ?1
           LIMIT 1`,
        )
        .bind(mockExam.id)
        .first<{ blueprint_id: number }>()
      if (mockBlueprint !== null) {
        await env.DB.prepare(
          `INSERT INTO mock_exam_attempts (
            public_id, mock_exam_id, blueprint_id, user_id, attempt_seed,
            attempt_number, mode, total_points
          ) VALUES (?1, ?2, ?3, ?4, ?5, 1, 'untimed', 150)`,
        ).bind(
          `mock-attempt-${crypto.randomUUID()}`,
          mockExam.id,
          mockBlueprint.blueprint_id,
          userId,
          crypto.randomUUID(),
        ).run()
      }
    }

    await env.DB.prepare(
      `INSERT INTO recovery_attempts (
        public_id, user_id, course_id, attempt_seed, idempotency_key,
        taxonomy_version, weakness_formula_version, question_count
      ) VALUES (?1, ?2, (SELECT id FROM courses WHERE slug = 'cse-professional'), ?3, ?4, 1, 1, 1)`,
    ).bind(
      `recovery-${crypto.randomUUID()}`,
      userId,
      crypto.randomUUID(),
      crypto.randomUUID(),
    ).run()

    const before = await qaStudentRelationSnapshot(userId)
    const beforeProgressRow = await env.DB
      .prepare('SELECT id FROM lesson_progress WHERE user_id = ?1 AND lesson_id = ?2')
      .bind(userId, firstLesson.id)
      .first<{ id: number }>()

    if (beforeProgressRow === null) throw new Error('Legacy baseline lesson progress is missing.')

    const firstResponse = await configure(cookie, email, 'unlocked')
    const repairedBody = await firstResponse.json<QaConfigureResponse>()
    const repairedId = repairedBody.data.target.id

    expect(firstResponse.status).toBe(200)
    expect(repairedId).toMatch(uuidPattern)
    expect(repairedId).not.toMatch(/^qa-student-/u)
    expect(repairedBody.data.target.email).toBe(email)

    const configuredUser = await env.DB
      .prepare('SELECT id, public_id, role FROM users WHERE id = ?1')
      .bind(userId)
      .first<{ id: number; public_id: string; role: string }>()

    expect(configuredUser?.id).toBe(userId)
    expect(configuredUser?.role).toBe('student')
    expect(configuredUser?.public_id).toBe(repairedId)
    expect(configuredUser?.public_id).not.toBe(legacyPublicId)

    const preservedProgress = await env.DB
      .prepare(
        'SELECT status, progress_percent FROM lesson_progress WHERE id = ?1',
      )
      .bind(beforeProgressRow.id)
      .first<{ status: string; progress_percent: number }>()
    expect(preservedProgress?.status).toBe('completed')
    expect(preservedProgress?.progress_percent).toBe(100)

    const loginAfterRepair = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email, password }),
    }, env)
    expect(loginAfterRepair.status).toBe(200)

    const after = await qaStudentRelationSnapshot(userId)
    expect(after.enrollmentCount).toBe(before.enrollmentCount)
    expect(after.progressCount).toBeGreaterThanOrEqual(before.progressCount)
    expect(after.completedProgressCount).toBeGreaterThanOrEqual(
      before.completedProgressCount,
    )
    expect(after.practiceAttemptCount).toBe(before.practiceAttemptCount)
    expect(after.quizAttemptCount).toBe(before.quizAttemptCount)
    expect(after.subjectAssessmentAttemptCount).toBe(before.subjectAssessmentAttemptCount)
    expect(after.mockExamAttemptCount).toBe(before.mockExamAttemptCount)
    expect(after.submittedRecoveryAttemptCount).toBe(before.submittedRecoveryAttemptCount)
    expect(after.recoveryAttemptCount).toBe(before.recoveryAttemptCount)

    const unrelatedUsersAfter = (await env.DB
      .prepare(
        `SELECT id, public_id, role, status FROM users WHERE email <> ?1 ORDER BY id`,
      )
      .bind(email)
      .all<{ id: number; public_id: string; role: string; status: string }>()).results
    expect(unrelatedUsersAfter).toEqual(unrelatedUsersBefore)

    const secondResponse = await configure(cookie, email, 'unlocked')
    const secondBody = await secondResponse.json<QaConfigureResponse>()
    const afterSecond = await qaStudentRelationSnapshot(userId)

    expect(secondResponse.status).toBe(200)
    expect(secondBody.data.target.id).toBe(repairedId)
    expect(afterSecond.enrollmentCount).toBe(after.enrollmentCount)
    expect(afterSecond.progressCount).toBe(after.progressCount)
    expect(afterSecond.completedProgressCount).toBe(after.completedProgressCount)
    expect(afterSecond.practiceAttemptCount).toBe(after.practiceAttemptCount)
    expect(afterSecond.quizAttemptCount).toBe(after.quizAttemptCount)
    expect(afterSecond.subjectAssessmentAttemptCount).toBe(after.subjectAssessmentAttemptCount)
    expect(afterSecond.mockExamAttemptCount).toBe(after.mockExamAttemptCount)
    expect(afterSecond.submittedRecoveryAttemptCount).toBe(after.submittedRecoveryAttemptCount)
  })

  it('rejects wrong-password and unknown-account logins for QA student credentials', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const email = `qa-login-${crypto.randomUUID()}@example.test`

    expect((await configure(cookie, email, 'unlocked')).status).toBe(200)

    const wrongPassword = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email, password: 'WrongPassword123' }),
    }, env)
    const unknownAccount = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email: `missing-${crypto.randomUUID()}@example.test`, password }),
    }, env)

    expect(wrongPassword.status).toBe(401)
    expect(unknownAccount.status).toBe(401)
  })

  it('keeps QA email normalization behavior after provisioning', async () => {
    const cookie = await createAdmin(`qa-admin-${crypto.randomUUID()}@example.test`)
    const rawEmail = `UPPER-TEST-${crypto.randomUUID()}@Example.Test`
    const normalized = rawEmail.toLowerCase()
    const configured = await configure(cookie, rawEmail, 'unlocked')
    const body = await configured.json<QaConfigureResponse>()

    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': testClientAddress(),
      },
      body: JSON.stringify({ email: rawEmail, password }),
    }, env)

    expect(configured.status).toBe(200)
    expect(body.data.target.email).toBe(normalized)
    expect(login.status).toBe(200)
  })
})
