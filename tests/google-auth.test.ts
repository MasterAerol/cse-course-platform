import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { AUTH_COOKIE_NAME } from '../src/worker/auth/cookie'
import type { VerifiedGoogleIdentity } from '../src/worker/auth/google'
import { app } from '../src/worker'
import { findUserByEmail } from '../src/worker/repositories/auth.repository'
import {
  authenticateSession,
  authenticateWithGoogle,
  changePassword,
  connectGoogleIdentity,
  loginUser,
  createVerifiedPasswordStudent,
} from '../src/worker/services/auth.service'
import { getLearnerCommercialAccess } from '../src/worker/services/commercial.service'
import type { Bindings } from '../src/worker/types/bindings'

const allowAllRateLimiter: RateLimit = {
  limit() {
    return Promise.resolve({ success: true })
  },
}

const bindings: Bindings = {
  DB: env.DB,
  ENVIRONMENT: 'production',
  REGISTRATION_MODE: 'closed',
  GOOGLE_CLIENT_ID: 'pasawise-test.apps.googleusercontent.com',
  LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
  LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
  REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
  ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
  AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
  ADMIN_RATE_LIMITER: allowAllRateLimiter,
}

const metadata = {
  userAgent: 'PasaWise Google auth test',
  ipAddress: '192.0.2.10',
}

function googleIdentity(
  email = `google-${crypto.randomUUID()}@gmail.com`,
  subject = `google-sub-${crypto.randomUUID()}`,
): VerifiedGoogleIdentity {
  return {
    subject,
    email,
    firstName: 'Google',
    lastName: 'Learner',
  }
}

describe('Google account registration and sign-in', () => {
  it('does not create a new account while registration is closed', async () => {
    const identity = googleIdentity()

    await expect(
      authenticateWithGoogle(env.DB, identity, metadata, {
        registrationEnabled: false,
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: 'REGISTRATION_CLOSED',
    })
    await expect(findUserByEmail(env.DB, identity.email)).resolves.toBeNull()
  })

  it('creates a normal FREE learner with CSE enrollment and no password', async () => {
    const identity = googleIdentity()
    let beforeCreateCalls = 0
    const result = await authenticateWithGoogle(env.DB, identity, metadata, {
      registrationEnabled: true,
      beforeCreate: () => {
        beforeCreateCalls += 1
        return Promise.resolve()
      },
    })
    const row = await env.DB.prepare(
      `SELECT
        users.id,
        users.role,
        users.status,
        users.password_hash,
        users.email_verified_at,
        course_enrollments.enrollment_status,
        course_enrollments.enrollment_source,
        COUNT(lesson_progress.id) AS progress_count
      FROM users
      INNER JOIN course_enrollments
        ON course_enrollments.user_id = users.id
      INNER JOIN courses
        ON courses.id = course_enrollments.course_id
        AND courses.slug = 'cse-professional'
      LEFT JOIN lesson_progress ON lesson_progress.user_id = users.id
      WHERE users.email = ?1
      GROUP BY users.id, course_enrollments.id`,
    )
      .bind(identity.email)
      .first<{
        id: number
        role: string
        status: string
        password_hash: string | null
        email_verified_at: string | null
        enrollment_status: string
        enrollment_source: string
        progress_count: number
      }>()
    const linked = await env.DB.prepare(
      `SELECT provider, provider_subject
      FROM user_identities
      WHERE user_id = ?1`,
    ).bind(row?.id ?? 0).first()
    const access = await getLearnerCommercialAccess(env.DB, row?.id ?? 0)

    expect(beforeCreateCalls).toBe(1)
    expect(result.user).toMatchObject({
      email: identity.email,
      role: 'student',
      signInMethods: {
        hasPassword: false,
        googleConnected: true,
      },
    })
    expect(row).toMatchObject({
      role: 'student',
      status: 'active',
      password_hash: null,
      enrollment_status: 'active',
      enrollment_source: 'free',
      progress_count: 0,
    })
    expect(row?.email_verified_at).not.toBeNull()
    expect(linked).toEqual({
      provider: 'google',
      provider_subject: identity.subject,
    })
    expect(access.accessType).toBe('FREE')

    const principal = await authenticateSession(env.DB, result.sessionToken)
    await expect(
      changePassword(env.DB, principal, result.sessionToken, {
        currentPassword: 'NotARealPassword123',
        newPassword: 'ReplacementPassword123',
        confirmNewPassword: 'ReplacementPassword123',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PASSWORD_NOT_CONFIGURED',
    })
    await expect(
      loginUser(env.DB, {
        email: identity.email,
        password: 'NotARealPassword123',
      }, metadata),
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('lets a linked learner sign in while closed and replaces the older learner session', async () => {
    const identity = googleIdentity()
    const first = await authenticateWithGoogle(env.DB, identity, metadata, {
      registrationEnabled: true,
    })
    const second = await authenticateWithGoogle(env.DB, identity, metadata, {
      registrationEnabled: false,
    })

    expect(second.user.id).toBe(first.user.id)
    await expect(
      authenticateSession(env.DB, first.sessionToken),
    ).rejects.toMatchObject({ code: 'SESSION_REPLACED' })
    await expect(
      authenticateSession(env.DB, second.sessionToken),
    ).resolves.toMatchObject({ id: second.user.id })

    const adminResponse = await app.request(
      '/api/admin/auth-check',
      {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${second.sessionToken}`,
        },
      },
      bindings,
    )
    expect(adminResponse.status).toBe(403)
  })

  it('requires intentional linking for an existing verified-email account', async () => {
    const email = `password-google-${crypto.randomUUID()}@example.test`
    const password = 'ExistingPassword123'
    const registered = await createVerifiedPasswordStudent(env.DB, {
      email,
      password,
      confirmPassword: password,
      firstName: 'Existing',
      lastName: 'Learner',
    }, metadata)
    const identity = googleIdentity(email)

    await expect(
      authenticateWithGoogle(env.DB, identity, metadata, {
        registrationEnabled: true,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'GOOGLE_ACCOUNT_LINKING_REQUIRED',
    })

    const principal = await authenticateSession(
      env.DB,
      registered.sessionToken,
    )
    await expect(
      connectGoogleIdentity(
        env.DB,
        principal,
        { ...identity, email: 'different@example.test' },
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'GOOGLE_EMAIL_MISMATCH',
    })

    const connected = await connectGoogleIdentity(
      env.DB,
      principal,
      identity,
    )
    const googleLogin = await authenticateWithGoogle(
      env.DB,
      identity,
      metadata,
      { registrationEnabled: false },
    )
    const passwordLogin = await loginUser(
      env.DB,
      { email, password },
      metadata,
    )

    expect(connected.id).toBe(registered.user.id)
    expect(connected.signInMethods).toEqual({
      hasPassword: true,
      googleConnected: true,
    })
    expect(googleLogin.user.id).toBe(registered.user.id)
    expect(passwordLogin.user.id).toBe(registered.user.id)
  })
})
