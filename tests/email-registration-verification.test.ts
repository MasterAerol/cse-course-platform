import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import { app } from '../src/worker'
import { AUTH_COOKIE_NAME } from '../src/worker/auth/cookie'
import { findPendingRegistrationByPublicId } from '../src/worker/repositories/pending-registration.repository'
import { registrationSchema } from '../src/worker/schemas/auth.schemas'
import {
  authenticateSession,
  beginPasswordRegistration,
  loginUser,
  resendPasswordRegistrationVerification,
  verifyPasswordRegistration,
} from '../src/worker/services/auth.service'
import {
  createTransactionalEmailService,
  type RegistrationVerificationEmail,
  type TransactionalEmailService,
} from '../src/worker/services/transactional-email.service'
import type { Bindings } from '../src/worker/types/bindings'
import { CapturingResendFetch, TEST_RESEND_API_KEY } from './helpers/resend'

const TEST_VERIFICATION_SECRET = 'test-only-email-verification-secret-2026'
const metadata = {
  userAgent: 'PasaWise email verification test',
  ipAddress: '192.0.2.30',
}

class CapturingEmailService implements TransactionalEmailService {
  readonly messages: RegistrationVerificationEmail[] = []

  sendRegistrationVerificationCode(
    input: RegistrationVerificationEmail,
  ): Promise<void> {
    this.messages.push(input)
    return Promise.resolve()
  }

  get latestCode(): string {
    const code = this.messages.at(-1)?.code
    if (code === undefined) throw new Error('No verification code was sent.')
    return code
  }
}


const allowAllRateLimiter: RateLimit = {
  limit: () => Promise.resolve({ success: true }),
}

function passwordRegistration(email: string) {
  return {
    email,
    password: 'VerifiedPassword123',
    confirmPassword: 'VerifiedPassword123',
    firstName: 'Email',
    lastName: 'Learner',
  }
}

function wrongCode(code: string): string {
  return code === '000000' ? '999999' : '000000'
}

describe('email/password registration verification', () => {
  it('keeps the learner pending with hashed secrets and resumes only for the correct password', async () => {
    const email = `pending-${crypto.randomUUID()}@outlook.com`
    const emailService = new CapturingEmailService()
    const pending = await beginPasswordRegistration(
      env.DB,
      passwordRegistration(email),
      emailService,
      TEST_VERIFICATION_SECRET,
    )
    const stored = await env.DB.prepare(
      `SELECT password_hash, code_hash, purpose
      FROM pending_registrations
      WHERE public_id = ?1`,
    ).bind(pending.registrationId).first<{
      password_hash: string
      code_hash: string
      purpose: string
    }>()
    const counts = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE email = ?1) AS users,
        (SELECT COUNT(*) FROM course_enrollments
          INNER JOIN users ON users.id = course_enrollments.user_id
          WHERE users.email = ?1) AS enrollments,
        (SELECT COUNT(*) FROM user_sessions
          INNER JOIN users ON users.id = user_sessions.user_id
          WHERE users.email = ?1) AS sessions`,
    ).bind(email).first<{ users: number; enrollments: number; sessions: number }>()

    expect(pending.maskedEmail).toMatch(/^pe.+@outlook\.com$/u)
    expect(stored?.password_hash).not.toContain('VerifiedPassword123')
    expect(stored?.code_hash).not.toContain(emailService.latestCode)
    expect(stored?.code_hash).toMatch(/^[0-9a-f]{64}$/u)
    expect(stored?.purpose).toBe('EMAIL_REGISTRATION_VERIFICATION')
    expect(counts).toEqual({ users: 0, enrollments: 0, sessions: 0 })

    await expect(loginUser(
      env.DB,
      { email, password: 'WrongPassword123' },
      metadata,
    )).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    await expect(loginUser(
      env.DB,
      { email, password: 'VerifiedPassword123' },
      metadata,
    )).rejects.toMatchObject({
      code: 'EMAIL_VERIFICATION_REQUIRED',
      details: { verification: { registrationId: pending.registrationId } },
    })
  })

  it('activates the user, session, and free enrollment only after one successful code use', async () => {
    const email = `verified-${crypto.randomUUID()}@icloud.com`
    const emailService = new CapturingEmailService()
    const pending = await beginPasswordRegistration(
      env.DB,
      passwordRegistration(email),
      emailService,
      TEST_VERIFICATION_SECRET,
    )
    const result = await verifyPasswordRegistration(
      env.DB,
      { registrationId: pending.registrationId, code: emailService.latestCode },
      metadata,
      TEST_VERIFICATION_SECRET,
    )

    const row = await env.DB.prepare(
      `SELECT
        users.email_verified_at,
        users.email_verification_method,
        course_enrollments.enrollment_status,
        course_enrollments.enrollment_source,
        COUNT(lesson_progress.id) AS progress_count
      FROM users
      INNER JOIN course_enrollments ON course_enrollments.user_id = users.id
      LEFT JOIN lesson_progress ON lesson_progress.user_id = users.id
      WHERE users.email = ?1
      GROUP BY users.id, course_enrollments.id`,
    ).bind(email).first<{
      email_verified_at: string | null
      email_verification_method: string | null
      enrollment_status: string
      enrollment_source: string
      progress_count: number
    }>()

    expect(result.user.emailVerification).toEqual({
      verified: true,
      method: 'email_otp',
    })
    expect(row).toMatchObject({
      email_verification_method: 'email_otp',
      enrollment_status: 'active',
      enrollment_source: 'free',
      progress_count: 0,
    })
    expect(row?.email_verified_at).not.toBeNull()
    await expect(authenticateSession(env.DB, result.sessionToken)).resolves.toMatchObject({
      id: result.user.id,
    })
    await expect(findPendingRegistrationByPublicId(
      env.DB,
      pending.registrationId,
    )).resolves.toBeNull()
    await expect(verifyPasswordRegistration(
      env.DB,
      { registrationId: pending.registrationId, code: emailService.latestCode },
      metadata,
      TEST_VERIFICATION_SECRET,
    )).rejects.toMatchObject({ code: 'VERIFICATION_NOT_FOUND' })
  })

  it('atomically consumes one code under concurrent verification', async () => {
    const email = `concurrent-${crypto.randomUUID()}@gmail.com`
    const emailService = new CapturingEmailService()
    const pending = await beginPasswordRegistration(
      env.DB,
      passwordRegistration(email),
      emailService,
      TEST_VERIFICATION_SECRET,
    )
    const verification = {
      registrationId: pending.registrationId,
      code: emailService.latestCode,
    }

    const results = await Promise.allSettled([
      verifyPasswordRegistration(
        env.DB,
        verification,
        metadata,
        TEST_VERIFICATION_SECRET,
      ),
      verifyPasswordRegistration(
        env.DB,
        verification,
        metadata,
        TEST_VERIFICATION_SECRET,
      ),
    ])
    const counts = await env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE email = ?1) AS users,
        (SELECT COUNT(*) FROM user_sessions
          INNER JOIN users ON users.id = user_sessions.user_id
          WHERE users.email = ?1) AS sessions,
        (SELECT COUNT(*) FROM course_enrollments
          INNER JOIN users ON users.id = course_enrollments.user_id
          WHERE users.email = ?1) AS enrollments`,
    ).bind(email).first<{ users: number; sessions: number; enrollments: number }>()

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(counts).toEqual({ users: 1, sessions: 1, enrollments: 1 })
  })

  it('enforces expiry, five attempts, resend cooldown, and old-code invalidation', async () => {
    const emailService = new CapturingEmailService()
    const now = new Date('2026-08-21T00:00:00.000Z')
    const pending = await beginPasswordRegistration(
      env.DB,
      passwordRegistration(`attempts-${crypto.randomUUID()}@proton.me`),
      emailService,
      TEST_VERIFICATION_SECRET,
      now,
    )
    const firstCode = emailService.latestCode

    await expect(resendPasswordRegistrationVerification(
      env.DB,
      { registrationId: pending.registrationId },
      emailService,
      TEST_VERIFICATION_SECRET,
      new Date(now.getTime() + 30_000),
    )).rejects.toMatchObject({ code: 'VERIFICATION_RESEND_TOO_SOON' })

    const resent = await resendPasswordRegistrationVerification(
      env.DB,
      { registrationId: pending.registrationId },
      emailService,
      TEST_VERIFICATION_SECRET,
      new Date(now.getTime() + 61_000),
    )
    const secondCode = emailService.latestCode
    await expect(verifyPasswordRegistration(
      env.DB,
      { registrationId: resent.registrationId, code: firstCode },
      metadata,
      TEST_VERIFICATION_SECRET,
      new Date(now.getTime() + 62_000),
    )).rejects.toMatchObject({ code: 'VERIFICATION_CODE_INVALID' })
    await expect(verifyPasswordRegistration(
      env.DB,
      { registrationId: resent.registrationId, code: secondCode },
      metadata,
      TEST_VERIFICATION_SECRET,
      new Date(now.getTime() + 62_000),
    )).resolves.toMatchObject({ user: { emailVerification: { verified: true } } })

    const lockedEmail = new CapturingEmailService()
    const locked = await beginPasswordRegistration(
      env.DB,
      passwordRegistration(`locked-${crypto.randomUUID()}@gmail.com`),
      lockedEmail,
      TEST_VERIFICATION_SECRET,
      now,
    )
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(verifyPasswordRegistration(
        env.DB,
        { registrationId: locked.registrationId, code: wrongCode(lockedEmail.latestCode) },
        metadata,
        TEST_VERIFICATION_SECRET,
        new Date(now.getTime() + attempt * 1_000),
      )).rejects.toMatchObject({ code: 'VERIFICATION_CODE_INVALID' })
    }
    await expect(verifyPasswordRegistration(
      env.DB,
      { registrationId: locked.registrationId, code: wrongCode(lockedEmail.latestCode) },
      metadata,
      TEST_VERIFICATION_SECRET,
      new Date(now.getTime() + 5_000),
    )).rejects.toMatchObject({ code: 'VERIFICATION_ATTEMPTS_EXCEEDED' })

    const expiredEmail = new CapturingEmailService()
    const expired = await beginPasswordRegistration(
      env.DB,
      passwordRegistration(`expired-${crypto.randomUUID()}@yahoo.com`),
      expiredEmail,
      TEST_VERIFICATION_SECRET,
      now,
    )
    await expect(verifyPasswordRegistration(
      env.DB,
      { registrationId: expired.registrationId, code: expiredEmail.latestCode },
      metadata,
      TEST_VERIFICATION_SECRET,
      new Date(now.getTime() + 10 * 60 * 1_000 + 1),
    )).rejects.toMatchObject({ code: 'VERIFICATION_CODE_EXPIRED' })
  })

  it('accepts common email providers and fails safely when delivery is unavailable', async () => {
    for (const email of [
      'learner@gmail.com',
      'learner@outlook.com',
      'learner@icloud.com',
      'learner@proton.me',
    ]) {
      expect(registrationSchema.safeParse(passwordRegistration(email)).success).toBe(true)
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const now = new Date('2026-08-21T00:00:00.000Z')
    const email = `delivery-${crypto.randomUUID()}@example.test`
    await expect(beginPasswordRegistration(
      env.DB,
      passwordRegistration(email),
      { sendRegistrationVerificationCode: () => Promise.reject(new Error('provider detail')) },
      TEST_VERIFICATION_SECRET,
      now,
    )).rejects.toMatchObject({ code: 'EMAIL_VERIFICATION_UNAVAILABLE' })
    const stored = await env.DB.prepare(
      `SELECT code_expires_at, last_sent_at
      FROM pending_registrations
      WHERE email = ?1`,
    ).bind(email).first<{ code_expires_at: string; last_sent_at: string | null }>()
    expect(Date.parse(stored?.code_expires_at ?? '')).toBeLessThanOrEqual(now.getTime())
    expect(stored?.last_sent_at).toBeNull()
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(email)
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('provider detail')
    consoleError.mockRestore()
  })

  it('keeps closed registration fail-closed and issues a cookie only after API verification', async () => {
    const testResend = new CapturingResendFetch()
    const bindings: Bindings = {
      DB: env.DB,
      ENVIRONMENT: 'production',
      REGISTRATION_MODE: 'closed',
      RESEND_API_KEY: TEST_RESEND_API_KEY,
      EMAIL_PROVIDER_FETCH: testResend.fetch,
      EMAIL_VERIFICATION_SECRET: TEST_VERIFICATION_SECRET,
      LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
      LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
      REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
      EMAIL_VERIFICATION_IP_RATE_LIMITER: allowAllRateLimiter,
      EMAIL_VERIFICATION_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
      ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
      AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
      ADMIN_RATE_LIMITER: allowAllRateLimiter,
    }
    const publicConfig = await app.request('/api/config', {}, bindings)
    const publicConfigText = await publicConfig.text()
    expect(publicConfig.status).toBe(200)
    expect(publicConfigText).not.toContain(TEST_RESEND_API_KEY)
    expect(publicConfigText).not.toContain('RESEND_API_KEY')
    const input = { ...passwordRegistration(`route-${crypto.randomUUID()}@gmail.com`), fullName: 'Route Learner' }
    const body = JSON.stringify({
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      fullName: input.fullName,
    })
    const closed = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }, bindings)
    expect(closed.status).toBe(403)
    expect(testResend.requests).toHaveLength(0)

    bindings.REGISTRATION_MODE = 'open'
    const started = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }, bindings)
    const startedBody = await started.json<{
      data: { verification: { registrationId: string } }
    }>()
    expect(started.status).toBe(202)
    expect(started.headers.get('set-cookie')).toBeNull()
    expect(testResend.latestCode).toMatch(/^\d{6}$/u)

    const verified = await app.request('/api/auth/register/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        registrationId: startedBody.data.verification.registrationId,
        code: testResend.latestCode,
      }),
    }, bindings)
    expect(verified.status).toBe(201)
    expect(verified.headers.get('set-cookie')).toContain(AUTH_COOKIE_NAME)
  })

  it('sends the expected verification email through Resend without exposing the API key', async () => {
    const testResend = new CapturingResendFetch()
    const service = createTransactionalEmailService(
      TEST_RESEND_API_KEY,
      testResend.fetch,
    )
    await service.sendRegistrationVerificationCode({
      to: 'learner@example.test',
      firstName: '<Learner>',
      code: '123456',
      expiresInMinutes: 10,
    })

    expect(testResend.requests).toHaveLength(1)
    const request = testResend.requests[0]
    expect(request.url).toBe('https://api.resend.com/emails')
    expect(request.method).toBe('POST')
    expect(request.headers.get('authorization')).toBe(
      `Bearer ${TEST_RESEND_API_KEY}`,
    )
    expect(request.headers.get('user-agent')).toBe('PasaWise-Worker/1.0')
    expect(request.body.from).toBe('PasaWise <noreply@pasawise.com>')
    expect(request.body.to).toEqual(['learner@example.test'])
    expect(request.body.subject).toBe('Your PasaWise verification code')
    expect(request.body.text).toContain('Your verification code is:\n\n123456')
    expect(request.body.text).toContain('This code expires in 10 minutes.')
    expect(request.body.text).toContain(
      "If you didn't create a PasaWise account, you can ignore this email.",
    )
    expect(request.body.text).toContain(
      'PasaWise\nAral nang wais. Pasa nang handa.',
    )
    expect(request.body.html).toContain('&lt;Learner&gt;')
    expect(request.body.html).toContain('123456')
    expect(JSON.stringify(request.body)).not.toContain(TEST_RESEND_API_KEY)
  })

  it('maps Resend delivery failures to a provider-neutral error', async () => {
    const providerFetch = vi.fn(() => Promise.resolve(Response.json(
      { message: 'provider-only failure detail' },
      { status: 403 },
    )))
    const service = createTransactionalEmailService(
      TEST_RESEND_API_KEY,
      providerFetch,
    )

    await expect(service.sendRegistrationVerificationCode({
      to: 'learner@example.test',
      firstName: 'Learner',
      code: '654321',
      expiresInMinutes: 10,
    })).rejects.toEqual(new Error('Transactional email delivery failed.'))
    expect(providerFetch).toHaveBeenCalledOnce()
  })
})
