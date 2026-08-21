import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import staticHeaders from '../public/_headers?raw'
import { app } from '../src/worker'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'
import { createVerifiedPasswordStudent } from '../src/worker/services/auth.service'
import type { Bindings } from '../src/worker/types/bindings'
import { MAXIMUM_JSON_BODY_BYTES } from '../src/worker/utils/validation'
import { discardResendFetch, TEST_RESEND_API_KEY } from './helpers/resend'

const allowAllRateLimiter: RateLimit = {
  limit() {
    return Promise.resolve({ success: true })
  },
}

const denyAllRateLimiter: RateLimit = {
  limit() {
    return Promise.resolve({ success: false })
  },
}

const testVerificationSecret = 'test-only-email-verification-secret-2026'


const bindings: Bindings = {
  DB: env.DB,
  ENVIRONMENT: 'production',
  REGISTRATION_MODE: 'open',
  LOGIN_IP_RATE_LIMITER: allowAllRateLimiter,
  LOGIN_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
  REGISTRATION_RATE_LIMITER: allowAllRateLimiter,
  ATTEMPT_RATE_LIMITER: allowAllRateLimiter,
  RESEND_API_KEY: TEST_RESEND_API_KEY,
  EMAIL_PROVIDER_FETCH: discardResendFetch,
  EMAIL_VERIFICATION_SECRET: testVerificationSecret,
  EMAIL_VERIFICATION_IP_RATE_LIMITER: allowAllRateLimiter,
  EMAIL_VERIFICATION_ACCOUNT_RATE_LIMITER: allowAllRateLimiter,
  AUTOSAVE_RATE_LIMITER: allowAllRateLimiter,
  ADMIN_RATE_LIMITER: allowAllRateLimiter,
}

function withBindings(overrides: Partial<Bindings>): Bindings {
  return { ...bindings, ...overrides }
}

function registrationRequest(extraHeaders: HeadersInit = {}): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      email: `security-${crypto.randomUUID()}@example.test`,
      password: 'ValidPassword123',
      firstName: 'Security',
      lastName: 'Test',
    }),
  }
}

describe('production security hardening', () => {
  it('attaches no-store and baseline security headers to API responses', async () => {
    const response = await app.request('/api/health', {}, bindings)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-security-policy')).toContain(
      "default-src 'none'",
    )
    expect(response.headers.get('strict-transport-security')).toContain(
      'max-age=31536000',
    )
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('cross-origin-opener-policy')).toBe(
      'same-origin',
    )
    expect(response.headers.get('cross-origin-resource-policy')).toBe(
      'same-origin',
    )
  })

  it('defines the same baseline for directly served static assets', () => {
    expect(staticHeaders).toContain("Content-Security-Policy: default-src 'none'")
    expect(staticHeaders).toContain('Strict-Transport-Security: max-age=31536000')
    expect(staticHeaders).toContain('X-Content-Type-Options: nosniff')
    expect(staticHeaders).toContain('X-Frame-Options: DENY')
  })

  it('rejects executable schemes in admin-authored media URLs', () => {
    expect(() =>
      validateLessonBlockContent('video', {
        provider: 'external',
        url: 'javascript:alert(document.domain)',
        title: 'Unsafe link',
      }),
    ).toThrow()
    expect(() =>
      validateLessonBlockContent('image', {
        src: 'data:text/html,<script>alert(1)</script>',
        alt: 'Unsafe image',
      }),
    ).toThrow()
    expect(
      validateLessonBlockContent('image', {
        src: '/images/percentage-grid.svg',
        alt: 'Safe image',
      }),
    ).toMatchObject({ src: '/images/percentage-grid.svg' })
  })

  it('rejects cross-site browser mutations before registration', async () => {
    const response = await app.request(
      '/api/auth/register',
      registrationRequest({
        origin: 'https://attacker.example',
        'sec-fetch-site': 'cross-site',
      }),
      bindings,
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'ORIGIN_NOT_ALLOWED' },
    })
  })

  it('does not grant cross-origin API access or credentialed CORS', async () => {
    const response = await app.request(
      '/api/health',
      { headers: { origin: 'https://attacker.example' } },
      bindings,
    )
    const preflight = await app.request(
      '/api/auth/login',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://attacker.example',
          'access-control-request-method': 'POST',
        },
      },
      bindings,
    )

    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(response.headers.get('access-control-allow-credentials')).toBeNull()
    expect(preflight.status).toBe(404)
    expect(preflight.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('allows canonical and fallback same-origin browser mutations plus publishers', async () => {
    const browserOrigins = [
      'https://pasawise.com',
      'https://cse-course-platform.master-course.workers.dev',
      'http://localhost',
    ]
    const sameOriginResponses: Response[] = []
    for (const origin of browserOrigins) {
      sameOriginResponses.push(await app.request(
        `${origin}/api/auth/register`,
        registrationRequest({
          origin,
          'sec-fetch-site': 'same-origin',
        }),
        bindings,
      ))
    }
    const publisher = await app.request(
      '/api/auth/register',
      registrationRequest(),
      bindings,
    )

    for (const response of sameOriginResponses) expect(response.status).toBe(202)
    expect(publisher.status).toBe(202)
  })

  it('closes production registration by default and for invalid configuration', async () => {
    for (const registrationMode of [undefined, 'invalid']) {
      const response = await app.request(
        '/api/auth/register',
        registrationRequest(),
        withBindings({ REGISTRATION_MODE: registrationMode }),
      )

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'REGISTRATION_CLOSED' },
      })
    }
  })

  it('opens registration only when explicitly configured and rejects client roles', async () => {
    const openResponse = await app.request(
      '/api/auth/register',
      registrationRequest(),
      withBindings({ REGISTRATION_MODE: 'open' }),
    )
    expect(openResponse.status).toBe(202)
    expect(openResponse.headers.get('set-cookie')).toBeNull()

    const roleResponse = await app.request(
      '/api/auth/register',
      {
        ...registrationRequest(),
        body: JSON.stringify({
          email: `role-${crypto.randomUUID()}@example.test`,
          password: 'ValidPassword123',
          firstName: 'Security',
          lastName: 'Test',
          role: 'admin',
        }),
      },
      withBindings({ REGISTRATION_MODE: 'open' }),
    )

    expect(roleResponse.status).toBe(400)
    await expect(roleResponse.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('keeps login available when registration is closed', async () => {
    const email = `closed-login-${crypto.randomUUID()}@example.test`
    await createVerifiedPasswordStudent(env.DB, {
      email,
      password: 'ValidPassword123',
      confirmPassword: 'ValidPassword123',
      firstName: 'Existing',
      lastName: 'Learner',
    }, {
      userAgent: 'Security test',
      ipAddress: '192.0.2.40',
    })

    const loginResponse = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'ValidPassword123' }),
      },
      withBindings({ REGISTRATION_MODE: 'closed' }),
    )

    expect(loginResponse.status).toBe(200)
  })

  it('returns a safe 429 with Retry-After and no actor data in logs', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const email = `limited-${crypto.randomUUID()}@example.test`
    const ipAddress = '203.0.113.10'
    const response = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ipAddress,
        },
        body: JSON.stringify({ email, password: 'ValidPassword123' }),
      },
      withBindings({ LOGIN_IP_RATE_LIMITER: denyAllRateLimiter }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'RATE_LIMITED' },
    })
    const logs = JSON.stringify(consoleWarn.mock.calls)
    expect(logs).not.toContain(email)
    expect(logs).not.toContain(ipAddress)
    consoleWarn.mockRestore()
  })

  it('rate limits authenticated attempt mutations before service execution', async () => {
    const registered = await createVerifiedPasswordStudent(env.DB, {
      email: `attempt-${crypto.randomUUID()}@example.test`,
      password: 'ValidPassword123',
      confirmPassword: 'ValidPassword123',
      firstName: 'Attempt',
      lastName: 'Learner',
    }, {
      userAgent: 'Security test',
      ipAddress: '192.0.2.41',
    })
    const cookie = `cse_session=${registered.sessionToken}`

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const response = await app.request(
      '/api/student/practice-sets/1/attempts',
      { method: 'POST', headers: { cookie: cookie ?? '' } },
      withBindings({ ATTEMPT_RATE_LIMITER: denyAllRateLimiter }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    consoleWarn.mockRestore()
  })

  it('fails closed in production when a required rate-limit binding is missing', async () => {
    const response = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'missing-limiter@example.test',
          password: 'ValidPassword123',
        }),
      },
      withBindings({ LOGIN_IP_RATE_LIMITER: undefined }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'SECURITY_CONFIGURATION_UNAVAILABLE' },
    })
  })

  it('uses host-only hardened sessions on the canonical and fallback origins', async () => {
    for (const origin of [
      'https://pasawise.com',
      'https://cse-course-platform.master-course.workers.dev',
    ]) {
      const email = `cookie-${crypto.randomUUID()}@example.test`
      await createVerifiedPasswordStudent(env.DB, {
        email,
        password: 'ValidPassword123',
        confirmPassword: 'ValidPassword123',
        firstName: 'Cookie',
        lastName: 'Learner',
      }, {
        userAgent: 'Security test',
        ipAddress: '192.0.2.42',
      })
      const loggedIn = await app.request(`${origin}/api/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin,
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify({ email, password: 'ValidPassword123' }),
      }, bindings)
      const setCookie = loggedIn.headers.get('set-cookie')
      const cookie = setCookie?.split(';')[0]
      expect(cookie).toBeDefined()
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('Secure')
      expect(setCookie).toContain('SameSite=Lax')
      expect(setCookie).toContain('Path=/')
      expect(setCookie).not.toMatch(/(?:^|;\s*)Domain=/iu)

      const response = await app.request(
        `${origin}/api/auth/logout`,
        {
          method: 'POST',
          headers: {
            cookie: cookie ?? '',
            origin,
            'sec-fetch-site': 'same-origin',
          },
        },
        bindings,
      )
      const cleared = response.headers.get('set-cookie')

      expect(response.status).toBe(200)
      expect(cleared).toContain('HttpOnly')
      expect(cleared).toContain('Secure')
      expect(cleared).toContain('SameSite=Lax')
      expect(cleared).toContain('Path=/')
      expect(cleared).not.toMatch(/(?:^|;\s*)Domain=/iu)
    }
  })

  it('rejects oversized JSON before schema validation', async () => {
    const response = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'oversized@example.test',
          password: 'x'.repeat(MAXIMUM_JSON_BODY_BYTES),
        }),
      },
      bindings,
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'REQUEST_BODY_TOO_LARGE' },
    })
  })

  it('rejects a declared oversized JSON body before authentication work', async () => {
    const response = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(MAXIMUM_JSON_BODY_BYTES + 1),
        },
        body: JSON.stringify({
          email: 'declared-oversized@example.test',
          password: 'ValidPassword123',
        }),
      },
      bindings,
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'REQUEST_BODY_TOO_LARGE' },
    })
  })

  it('returns safe JSON without internal exception details on a 500', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const failingBindings = {
      DB: {
        prepare() {
          throw new Error('sensitive database detail')
        },
      } as unknown as D1Database,
      ENVIRONMENT: 'production' as const,
    }
    const response = await app.request('/api/courses', {}, failingBindings)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(text).toContain('INTERNAL_SERVER_ERROR')
    expect(text).not.toContain('sensitive database detail')
    expect(text).not.toContain('stack')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      'sensitive database detail',
    )
    consoleError.mockRestore()
  })
})
