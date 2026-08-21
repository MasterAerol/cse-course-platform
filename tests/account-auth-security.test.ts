import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { verifyPassword } from '../src/worker/auth/password'
import { app } from '../src/worker'
import type { Bindings } from '../src/worker/types/bindings'

const allowAllRateLimiter: RateLimit = {
  limit() {
    return Promise.resolve({ success: true })
  },
}

const bindings: Bindings = {
  DB: env.DB,
  ENVIRONMENT: 'production',
  REGISTRATION_MODE: 'open',
  LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
  LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
  REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
  ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
  AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
  ADMIN_RATE_LIMITER: allowAllRateLimiter,
}

function jsonRequest(
  body: Record<string, unknown>,
  cookie?: string,
): RequestInit {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (cookie !== undefined) {
    headers.set('cookie', cookie)
  }
  return { method: 'POST', headers, body: JSON.stringify(body) }
}

function getCookie(response: Response): string {
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0]
  if (cookie === undefined) {
    throw new Error('Expected an authentication cookie.')
  }
  return cookie
}

async function register(
  email: string,
  password = 'OriginalPassword123',
): Promise<{ response: Response; cookie: string }> {
  const response = await app.request(
    '/api/auth/register',
    jsonRequest({
      email,
      password,
      confirmPassword: password,
      firstName: 'Fresh',
      lastName: 'Learner',
    }),
    bindings,
  )
  return { response, cookie: getCookie(response) }
}

async function login(email: string, password: string): Promise<Response> {
  return app.request(
    '/api/auth/login',
    jsonRequest({ email, password }),
    bindings,
  )
}

describe('global account authentication security', () => {
  it('creates only a normal fresh learner with an active CSE enrollment', async () => {
    const email = `fresh-${crypto.randomUUID()}@example.test`
    const { response } = await register(email)
    const responseText = await response.text()
    const row = await env.DB.prepare(
      `SELECT
        users.role,
        users.status,
        course_enrollments.enrollment_status,
        course_enrollments.enrollment_source,
        COUNT(lesson_progress.id) AS lesson_progress_count
      FROM users
      INNER JOIN course_enrollments
        ON course_enrollments.user_id = users.id
      INNER JOIN courses
        ON courses.id = course_enrollments.course_id
        AND courses.slug = 'cse-professional'
      LEFT JOIN lesson_progress
        ON lesson_progress.user_id = users.id
      WHERE users.email = ?1
      GROUP BY users.id, course_enrollments.id`,
    )
      .bind(email)
      .first<{
        role: string
        status: string
        enrollment_status: string
        enrollment_source: string
        lesson_progress_count: number
      }>()

    expect(response.status).toBe(201)
    expect(row).toEqual({
      role: 'student',
      status: 'active',
      enrollment_status: 'active',
      enrollment_source: 'free',
      lesson_progress_count: 0,
    })
    expect(responseText).not.toContain('password')
    expect(responseText).not.toContain('admin')
  })

  it('rejects registration confirmation mismatch without creating a user', async () => {
    const email = `mismatch-${crypto.randomUUID()}@example.test`
    const response = await app.request(
      '/api/auth/register',
      jsonRequest({
        email,
        password: 'OriginalPassword123',
        confirmPassword: 'DifferentPassword123',
        firstName: 'Fresh',
        lastName: 'Learner',
      }),
      bindings,
    )
    const stored = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?1',
    ).bind(email).first()

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: {
          fieldErrors: {
            confirmPassword: ['Passwords must match.'],
          },
        },
      },
    })
    expect(stored).toBeNull()
  })

  it('requires the current password and validates the replacement server-side', async () => {
    const email = `password-validation-${crypto.randomUUID()}@example.test`
    const { cookie } = await register(email)

    const wrongCurrent = await app.request(
      '/api/auth/change-password',
      jsonRequest({
        currentPassword: 'WrongPassword123',
        newPassword: 'ReplacementPassword123',
        confirmNewPassword: 'ReplacementPassword123',
      }, cookie),
      bindings,
    )
    expect(wrongCurrent.status).toBe(400)
    await expect(wrongCurrent.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'CURRENT_PASSWORD_INCORRECT' },
    })

    const invalidReplacement = await app.request(
      '/api/auth/change-password',
      jsonRequest({
        currentPassword: 'OriginalPassword123',
        newPassword: 'short',
        confirmNewPassword: 'different',
      }, cookie),
      bindings,
    )
    expect(invalidReplacement.status).toBe(400)
    const invalidReplacementText = await invalidReplacement.text()
    expect(invalidReplacementText).toContain('VALIDATION_ERROR')
    expect(invalidReplacementText).toContain('"newPassword"')
    expect(invalidReplacementText).toContain('Password must contain at least')
  })

  it('updates the versioned hash, keeps the latest learner session, and revokes older sessions', async () => {
    const email = `password-success-${crypto.randomUUID()}@example.test`
    const originalPassword = 'OriginalPassword123'
    const replacementPassword = 'ReplacementPassword456'
    const { cookie: replacedCookie } = await register(email, originalPassword)
    const secondLogin = await login(email, originalPassword)
    const currentCookie = getCookie(secondLogin)

    const response = await app.request(
      '/api/auth/change-password',
      jsonRequest({
        currentPassword: originalPassword,
        newPassword: replacementPassword,
        confirmNewPassword: replacementPassword,
      }, currentCookie),
      bindings,
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        passwordUpdated: true,
        otherSessionsRevoked: true,
      },
    })

    const currentSession = await app.request(
      '/api/auth/me',
      { headers: { cookie: currentCookie } },
      bindings,
    )
    const replacedSession = await app.request(
      '/api/auth/me',
      { headers: { cookie: replacedCookie } },
      bindings,
    )
    const oldLogin = await login(email, originalPassword)
    const newLogin = await login(email, replacementPassword)
    const stored = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE email = ?1',
    )
      .bind(email)
      .first<{ password_hash: string }>()

    expect(currentSession.status).toBe(200)
    expect(replacedSession.status).toBe(401)
    expect(oldLogin.status).toBe(401)
    expect(newLogin.status).toBe(200)
    expect(stored?.password_hash).toMatch(/^pbkdf2-sha256\$v1\$100000\$/u)
    await expect(
      verifyPassword(replacementPassword, stored?.password_hash ?? ''),
    ).resolves.toBe(true)
    const loginResponseText = JSON.stringify(await newLogin.json())
    expect(loginResponseText).not.toContain('"password":')
    expect(loginResponseText).not.toContain('passwordHash')
  })
})
