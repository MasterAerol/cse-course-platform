import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../src/worker'
import {
  hashPassword,
  verifyPassword,
} from '../src/worker/auth/password'
import { hashSessionToken } from '../src/worker/auth/session'
import type { Bindings } from '../src/worker/types/bindings'

interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    requestId: string
    details: {
      fieldErrors: Partial<
        Record<
          'firstName' | 'lastName' | 'email' | 'password',
          string[]
        >
      >
    } | null
  }
}

interface StoredAuthenticationRow {
  password_hash: string
  token_hash: string
  expires_at: string
  revoked_at: string | null
  role: string
  status: string
}

interface CourseListBody {
  success: true
  data: {
    courses: Array<{
      title: string
      slug: string
      shortDescription: string | null
      level: string | null
      thumbnailKey: string | null
      enrollment: EnrollmentBody | null
    }>
  }
}

interface CourseDetailBody {
  success: true
  data: {
    title: string
    slug: string
    description: string | null
    enrollment: EnrollmentBody | null
    curriculum: Array<{
      title: string
      slug: string
      topics: Array<{
        title: string
        slug: string
        publishedLessonCount: number
      }>
    }>
  }
}

interface DashboardBody {
  success: true
  data: {
    courses: DashboardCourseBody[]
  }
}

interface CourseProgressBody {
  success: true
  data: DashboardCourseBody
}

interface DashboardCourseBody {
  course: {
    title: string
    slug: string
  }
  enrollment: EnrollmentBody
  progressPercentage: number
  completedRequiredLessons: number
  totalRequiredLessons: number
  continueLearning: {
    courseCompleted: boolean
    lesson: {
      title: string
      slug: string
      lessonType: string
      summary: string | null
    } | null
  }
}

interface EnrollmentBody {
  status: string
  accessStartsAt: string
  accessExpiresAt: string | null
  hasAccess: boolean
}

const validPassword = 'SecurePassword123'

const passwordValidationCases = [
  {
    name: 'missing uppercase character',
    password: 'securepassword123',
    message: 'Password must include an uppercase letter.',
  },
  {
    name: 'missing lowercase character',
    password: 'SECUREPASSWORD123',
    message: 'Password must include a lowercase letter.',
  },
  {
    name: 'missing number',
    password: 'SecurePassword',
    message: 'Password must include a number.',
  },
  {
    name: 'shorter than 12 characters',
    password: 'Short1A',
    message: 'Password must contain at least 12 characters.',
  },
] satisfies ReadonlyArray<{
  name: string
  password: string
  message: string
}>

function createBindings(
  environment: Bindings['ENVIRONMENT'],
): Bindings {
  return {
    DB: env.DB,
    ENVIRONMENT: environment,
  }
}

function jsonRequest(
  body: Record<string, unknown>,
  cookie?: string,
): RequestInit {
  const headers = new Headers({
    'content-type': 'application/json',
  })

  if (cookie !== undefined) {
    headers.set('cookie', cookie)
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }
}

function getCookieHeader(response: Response): string {
  const setCookie = response.headers.get('set-cookie')
  expect(setCookie).toBeTruthy()

  const cookie = setCookie?.split(';', 1)[0]
  expect(cookie).toMatch(/^cse_session=[A-Za-z0-9_-]+$/u)

  if (cookie === undefined) {
    throw new Error('The authentication cookie was not set.')
  }

  return cookie
}

async function expectRegistrationFieldError(
  body: Record<string, unknown>,
  field: 'firstName' | 'lastName' | 'email' | 'password',
  message: string,
): Promise<ApiErrorBody> {
  const response = await app.request(
    '/api/auth/register',
    jsonRequest(body),
    createBindings('production'),
  )
  const responseBody = await response.json<ApiErrorBody>()

  expect(response.status).toBe(400)
  expect(responseBody).toMatchObject({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid fields.',
    },
  })
  expect(responseBody.error.details).not.toBeNull()
  expect(responseBody.error.details?.fieldErrors[field]).toContain(
    message,
  )

  return responseBody
}

async function register(
  email: string,
  environment: Bindings['ENVIRONMENT'] = 'production',
): Promise<{ response: Response; cookie: string }> {
  const response = await app.request(
    '/api/auth/register',
    jsonRequest({
      email,
      password: validPassword,
      firstName: 'Ada',
      lastName: 'Lovelace',
    }),
    createBindings(environment),
  )

  return {
    response,
    cookie: getCookieHeader(response),
  }
}

async function getUserId(email: string): Promise<number> {
  const user = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?1 LIMIT 1',
  )
    .bind(email)
    .first<{ id: number }>()

  if (user === null) {
    throw new Error(`Test user was not found: ${email}`)
  }

  return user.id
}

async function getCourseId(courseSlug = 'cse-professional'): Promise<number> {
  const course = await env.DB.prepare(
    'SELECT id FROM courses WHERE slug = ?1 LIMIT 1',
  )
    .bind(courseSlug)
    .first<{ id: number }>()

  if (course === null) {
    throw new Error(`Test course was not found: ${courseSlug}`)
  }

  return course.id
}

async function getLessonId(lessonSlug: string): Promise<number> {
  const lesson = await env.DB.prepare(
    `SELECT lessons.id
    FROM lessons
    INNER JOIN topics ON topics.id = lessons.topic_id
    INNER JOIN subjects ON subjects.id = topics.subject_id
    INNER JOIN courses ON courses.id = subjects.course_id
    WHERE courses.slug = 'cse-professional'
      AND lessons.slug = ?1
    LIMIT 1`,
  )
    .bind(lessonSlug)
    .first<{ id: number }>()

  if (lesson === null) {
    throw new Error(`Test lesson was not found: ${lessonSlug}`)
  }

  return lesson.id
}

async function enrollUser(
  email: string,
  options: {
    status?: 'active' | 'expired' | 'revoked' | 'completed'
    accessStartsAt?: string
    accessExpiresAt?: string | null
  } = {},
): Promise<void> {
  const [userId, courseId] = await Promise.all([
    getUserId(email),
    getCourseId(),
  ])

  await env.DB.prepare(
    `INSERT INTO course_enrollments (
      user_id,
      course_id,
      enrollment_status,
      access_starts_at,
      access_expires_at,
      enrollment_source
    ) VALUES (?1, ?2, ?3, ?4, ?5, 'admin')
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      enrollment_status = excluded.enrollment_status,
      access_starts_at = excluded.access_starts_at,
      access_expires_at = excluded.access_expires_at`,
  )
    .bind(
      userId,
      courseId,
      options.status ?? 'active',
      options.accessStartsAt ?? '2000-01-01T00:00:00.000Z',
      options.accessExpiresAt ?? null,
    )
    .run()
}

async function setLessonProgress(
  email: string,
  lessonSlug: string,
  status: 'in_progress' | 'completed',
): Promise<void> {
  const [userId, lessonId] = await Promise.all([
    getUserId(email),
    getLessonId(lessonSlug),
  ])
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO lesson_progress (
      user_id,
      lesson_id,
      status,
      started_at,
      completed_at,
      last_viewed_at,
      progress_percent
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?6)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      status = excluded.status,
      started_at = COALESCE(lesson_progress.started_at, excluded.started_at),
      completed_at = excluded.completed_at,
      last_viewed_at = excluded.last_viewed_at,
      progress_percent = excluded.progress_percent`,
  )
    .bind(
      userId,
      lessonId,
      status,
      now,
      status === 'completed' ? now : null,
      status === 'completed' ? 100 : 40,
    )
    .run()
}

describe('Worker foundation', () => {
  it('returns the standard health response', async () => {
    const response = await app.request(
      '/api/health',
      undefined,
      createBindings('production'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    })
  })

  it('keeps the database check available only in development', async () => {
    const productionResponse = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('production'),
    )
    const developmentResponse = await app.request(
      '/api/dev/database-check',
      undefined,
      createBindings('development'),
    )

    expect(productionResponse.status).toBe(404)
    expect(developmentResponse.status).toBe(200)
    await expect(developmentResponse.json()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    })
  })

  it('does not expose internal errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const brokenBindings: Bindings = {
      DB: null as unknown as D1Database,
      ENVIRONMENT: 'development',
    }

    const response = await app.request(
      '/api/dev/database-check',
      undefined,
      brokenBindings,
    )
    const responseText = await response.text()

    expect(response.status).toBe(500)
    expect(responseText).not.toContain('stack')
    expect(responseText).not.toContain('database.service')
    expect(JSON.parse(responseText)).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        requestId: response.headers.get('x-request-id'),
        details: null,
      },
    })
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('Course catalog and student learning APIs', () => {
  it('hides draft courses from the public catalog', async () => {
    const draftSlug = `draft-${crypto.randomUUID()}`

    await env.DB.prepare(
      `INSERT INTO courses (
        public_id,
        title,
        slug,
        short_description,
        status
      ) VALUES (?1, 'Draft Course', ?2, 'Hidden draft', 'draft')`,
    )
      .bind(`course-${draftSlug}`, draftSlug)
      .run()

    const response = await app.request(
      '/api/courses',
      undefined,
      createBindings('production'),
    )
    const body = await response.json<CourseListBody>()

    expect(response.status).toBe(200)
    expect(body.data.courses.some((course) => course.slug === draftSlug)).toBe(
      false,
    )
  })

  it('returns the published CSE Professional course and safe curriculum summary', async () => {
    const response = await app.request(
      '/api/courses/cse-professional',
      undefined,
      createBindings('production'),
    )
    const body = await response.json<CourseDetailBody>()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      title: 'CSE Professional',
      slug: 'cse-professional',
      enrollment: null,
      curriculum: [
        {
          title: 'Numerical Ability',
          slug: 'numerical-ability',
          topics: [
            {
              title: 'Percentages',
              slug: 'percentages',
              publishedLessonCount: 11,
            },
          ],
        },
      ],
    })
    expect(JSON.stringify(body)).not.toContain('content_json')
  })

  it('accepts active enrollments and returns the first lesson for Continue Learning', async () => {
    const email = 'active-enrollment@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.enrollment).toMatchObject({
      status: 'active',
      hasAccess: true,
    })
    expect(body.data.progressPercentage).toBe(0)
    expect(body.data.totalRequiredLessons).toBe(11)
    expect(body.data.continueLearning.lesson?.slug).toBe(
      'introduction-to-percentages',
    )
  })

  it.each([
    {
      name: 'expired',
      status: 'active',
      accessStartsAt: '2000-01-01T00:00:00.000Z',
      accessExpiresAt: '2001-01-01T00:00:00.000Z',
    },
    {
      name: 'revoked',
      status: 'revoked',
      accessStartsAt: '2000-01-01T00:00:00.000Z',
      accessExpiresAt: null,
    },
    {
      name: 'future access start',
      status: 'active',
      accessStartsAt: '2999-01-01T00:00:00.000Z',
      accessExpiresAt: null,
    },
  ] satisfies ReadonlyArray<{
    name: string
    status: 'active' | 'revoked'
    accessStartsAt: string
    accessExpiresAt: string | null
  }>)('denies progress for $name enrollments', async (enrollment) => {
    const email = `${enrollment.name.replaceAll(' ', '-')}@example.com`
    const { cookie } = await register(email)
    await enrollUser(email, enrollment)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'COURSE_ACCESS_DENIED',
      },
    })
  })

  it('does not allow a student to read another student enrollment', async () => {
    const enrolledEmail = 'owner-enrollment@example.com'
    const otherEmail = 'other-student@example.com'
    await register(enrolledEmail)
    const { cookie: otherCookie } = await register(otherEmail)
    await enrollUser(enrolledEmail)

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie: otherCookie } },
      createBindings('production'),
    )

    expect(response.status).toBe(403)
  })

  it('calculates progress from completed required published lessons', async () => {
    const email = 'progress-calculation@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await setLessonProgress(email, 'introduction-to-percentages', 'completed')
    await setLessonProgress(email, 'understanding-percentages', 'completed')

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.completedRequiredLessons).toBe(2)
    expect(body.data.totalRequiredLessons).toBe(11)
    expect(body.data.progressPercentage).toBe(18)
    expect(body.data.continueLearning.lesson?.slug).toBe(
      'fractions-decimals-and-percentages',
    )
  })

  it('prioritizes an in-progress lesson for Continue Learning', async () => {
    const email = 'in-progress-priority@example.com'
    const { cookie } = await register(email)
    await enrollUser(email)
    await setLessonProgress(email, 'finding-the-rate', 'in_progress')

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.continueLearning.lesson?.slug).toBe('finding-the-rate')
  })

  it('returns completed course state when every required lesson is complete', async () => {
    const email = 'completed-course@example.com'
    const { cookie } = await register(email)
    const lessonSlugs = [
      'introduction-to-percentages',
      'understanding-percentages',
      'fractions-decimals-and-percentages',
      'finding-the-percentage',
      'finding-the-base',
      'finding-the-rate',
      'percentage-increase-and-decrease',
      'discounts-and-markups',
      'worked-examples',
      'guided-practice',
      'percentages-topic-quiz',
    ]

    await enrollUser(email)
    await Promise.all(
      lessonSlugs.map((lessonSlug) =>
        setLessonProgress(email, lessonSlug, 'completed'),
      ),
    )

    const response = await app.request(
      '/api/student/courses/cse-professional/progress',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<CourseProgressBody>()

    expect(response.status).toBe(200)
    expect(body.data.progressPercentage).toBe(100)
    expect(body.data.continueLearning).toEqual({
      courseCompleted: true,
      lesson: null,
    })
  })

  it('returns an empty dashboard state for students with no enrollments', async () => {
    const { cookie } = await register('empty-dashboard@example.com')

    const response = await app.request(
      '/api/student/dashboard',
      { headers: { cookie } },
      createBindings('production'),
    )
    const body = await response.json<DashboardBody>()

    expect(response.status).toBe(200)
    expect(body.data.courses).toEqual([])
  })
})

describe('Password hashing', () => {
  it('uses the Worker-supported PBKDF2 work factor and verifies it', async () => {
    const storedHash = await hashPassword(validPassword)
    const secondStoredHash = await hashPassword(validPassword)

    expect(storedHash).toMatch(
      /^pbkdf2-sha256\$v1\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/u,
    )
    expect(secondStoredHash).not.toBe(storedHash)
    await expect(
      verifyPassword(validPassword, storedHash),
    ).resolves.toBe(true)
    await expect(
      verifyPassword('WrongPassword123', storedHash),
    ).resolves.toBe(false)
  })

  it('rejects malformed password records without throwing', async () => {
    const malformedHashes = [
      '',
      'pbkdf2-sha256$v1$not-a-number$salt$hash',
      'pbkdf2-sha256$v1$100000$salt',
      'unknown$v1$100000$salt$hash',
      'pbkdf2-sha256$v2$100000$salt$hash',
    ]

    for (const storedHash of malformedHashes) {
      await expect(
        verifyPassword(validPassword, storedHash),
      ).resolves.toBe(false)
    }
  })

  it('rejects excessive iteration values before deriving a hash', async () => {
    const supportedHash = await hashPassword(validPassword)
    const excessiveHash = supportedHash.replace(
      '$100000$',
      '$600000$',
    )

    await expect(
      verifyPassword(validPassword, excessiveHash),
    ).resolves.toBe(false)
  })
})

describe('Authentication API', () => {
  it('normalizes a valid mixed-case email before storing it', async () => {
    const password = validPassword
    const { response, cookie } = await register(
      'JuanDelaCruz@example.com',
    )
    const responseText = await response.text()
    const rawToken = cookie.slice('cse_session='.length)
    const expectedTokenHash = await hashSessionToken(rawToken)
    const stored = await env.DB.prepare(
      `SELECT
        users.password_hash,
        user_sessions.token_hash,
        user_sessions.expires_at,
        user_sessions.revoked_at,
        users.role,
        users.status
      FROM users
      INNER JOIN user_sessions ON user_sessions.user_id = users.id
      WHERE users.email = ?1`,
    )
      .bind('juandelacruz@example.com')
      .first<StoredAuthenticationRow>()
    const setCookie = response.headers.get('set-cookie')

    expect(response.status).toBe(201)
    expect(responseText).not.toContain('password')
    expect(responseText).not.toContain('token')
    expect(responseText).toContain('juandelacruz@example.com')
    expect(stored).not.toBeNull()
    expect(stored?.password_hash).toMatch(
      /^pbkdf2-sha256\$v1\$100000\$/u,
    )
    expect(stored?.password_hash).not.toContain(password)
    expect(stored?.token_hash).toBe(expectedTokenHash)
    expect(stored?.token_hash).not.toBe(rawToken)
    expect(stored?.role).toBe('student')
    expect(stored?.status).toBe('active')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
  })

  it('registers and logs in with a 100,000-iteration password record', async () => {
    const email = 'worker-limit-login@example.com'
    const { response: registrationResponse } = await register(email)
    const stored = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ password_hash: string }>()
    const loginResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: validPassword,
      }),
      createBindings('production'),
    )

    expect(registrationResponse.status).toBe(201)
    expect(stored?.password_hash).toMatch(
      /^pbkdf2-sha256\$v1\$100000\$/u,
    )
    expect(loginResponse.status).toBe(200)
    expect(loginResponse.headers.get('set-cookie')).toContain(
      'cse_session=',
    )
  })

  it('trims leading and trailing email spaces before storing it', async () => {
    const email = 'spaced.email@example.com'
    const { response } = await register(`  ${email}  `)
    const stored = await env.DB.prepare(
      'SELECT email FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ email: string }>()

    expect(response.status).toBe(201)
    expect(stored?.email).toBe(email)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        user: {
          email,
        },
      },
    })
  })

  it('returns a field error for an invalid email', async () => {
    await expectRegistrationFieldError(
      {
        email: 'not-an-email',
        password: validPassword,
        firstName: 'Invalid',
        lastName: 'Email',
      },
      'email',
      'Enter a valid email address.',
    )
  })

  it.each(passwordValidationCases)(
    'returns a password field error when it is $name',
    async ({ password, message }) => {
      await expectRegistrationFieldError(
        {
          email: `password-validation-${crypto.randomUUID()}@example.com`,
          password,
          firstName: 'Password',
          lastName: 'Validation',
        },
        'password',
        message,
      )
    },
  )

  it('returns field errors for missing first and last names', async () => {
    const responseBody = await expectRegistrationFieldError(
      {
        email: 'missing-names@example.com',
        password: validPassword,
        firstName: '',
        lastName: '  ',
      },
      'firstName',
      'First name is required.',
    )

    expect(
      responseBody.error.details?.fieldErrors.lastName,
    ).toContain('Last name is required.')
  })

  it('restores a session with me and rejects expired sessions', async () => {
    const email = 'session-expiry@example.com'
    const { cookie } = await register(email)
    const authenticatedResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(authenticatedResponse.status).toBe(200)
    await expect(authenticatedResponse.json()).resolves.toMatchObject({
      success: true,
      data: {
        user: {
          email,
          role: 'student',
        },
      },
    })

    await env.DB.prepare(
      `UPDATE user_sessions
      SET expires_at = '2000-01-01T00:00:00.000Z'
      WHERE user_id = (SELECT id FROM users WHERE email = ?1)`,
    )
      .bind(email)
      .run()

    const expiredResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(expiredResponse.status).toBe(401)
    await expect(expiredResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
      },
    })
  })

  it('revokes the server session on logout', async () => {
    const email = 'logout@example.com'
    const { cookie } = await register(email)
    const logoutResponse = await app.request(
      '/api/auth/logout',
      jsonRequest({}, cookie),
      createBindings('production'),
    )
    const stored = await env.DB.prepare(
      `SELECT user_sessions.revoked_at
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE users.email = ?1`,
    )
      .bind(email)
      .first<{ revoked_at: string | null }>()
    const meResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.headers.get('set-cookie')).toContain(
      'cse_session=',
    )
    expect(stored?.revoked_at).not.toBeNull()
    expect(meResponse.status).toBe(401)
  })

  it('uses the same generic failure for unknown email and wrong password', async () => {
    const email = 'generic-login@example.com'
    await register(email)

    const wrongPasswordResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: 'WrongPassword123',
      }),
      createBindings('production'),
    )
    const unknownEmailResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email: 'unknown-login@example.com',
        password: 'WrongPassword123',
      }),
      createBindings('production'),
    )
    const wrongPasswordBody =
      await wrongPasswordResponse.json<ApiErrorBody>()
    const unknownEmailBody =
      await unknownEmailResponse.json<ApiErrorBody>()

    expect(wrongPasswordResponse.status).toBe(401)
    expect(unknownEmailResponse.status).toBe(401)
    expect({
      code: wrongPasswordBody.error.code,
      message: wrongPasswordBody.error.message,
    }).toEqual({
      code: unknownEmailBody.error.code,
      message: unknownEmailBody.error.message,
    })
    expect(wrongPasswordBody.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    })
  })

  it('rejects suspended accounts and revokes their active sessions', async () => {
    const email = 'suspended@example.com'
    const { cookie } = await register(email)

    await env.DB.prepare(
      `UPDATE users SET status = 'suspended' WHERE email = ?1`,
    )
      .bind(email)
      .run()

    const meResponse = await app.request(
      '/api/auth/me',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )
    const loginResponse = await app.request(
      '/api/auth/login',
      jsonRequest({
        email,
        password: validPassword,
      }),
      createBindings('production'),
    )
    const stored = await env.DB.prepare(
      `SELECT user_sessions.revoked_at
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE users.email = ?1`,
    )
      .bind(email)
      .first<{ revoked_at: string | null }>()

    expect(meResponse.status).toBe(403)
    expect(loginResponse.status).toBe(403)
    await expect(meResponse.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
      },
    })
    expect(stored?.revoked_at).not.toBeNull()
  })

  it('enforces student and admin roles from D1', async () => {
    const email = 'role-check@example.com'
    const { cookie } = await register(email)
    const studentResponse = await app.request(
      '/api/admin/auth-check',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )

    expect(studentResponse.status).toBe(403)

    await env.DB.prepare(
      `UPDATE users SET role = 'admin' WHERE email = ?1`,
    )
      .bind(email)
      .run()

    const adminResponse = await app.request(
      '/api/admin/auth-check',
      {
        headers: {
          cookie,
        },
      },
      createBindings('production'),
    )
    const responseText = await adminResponse.text()

    expect(adminResponse.status).toBe(200)
    expect(responseText).toContain('"authorized":true')
    expect(responseText).toContain('"role":"admin"')
    expect(responseText).not.toContain('internalUserId')
  })

  it('rejects client attempts to choose a role', async () => {
    const response = await app.request(
      '/api/auth/register',
      jsonRequest({
        email: 'client-role@example.com',
        password: validPassword,
        firstName: 'Client',
        lastName: 'Role',
        role: 'admin',
      }),
      createBindings('production'),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: {
          fieldErrors: {},
        },
      },
    })
  })
})
