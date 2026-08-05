import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'

import staticHeaders from '../public/_headers?raw'
import { app } from '../src/worker'
import { validateLessonBlockContent } from '../src/worker/schemas/lesson-block.schemas'
import type { Bindings } from '../src/worker/types/bindings'
import { MAXIMUM_JSON_BODY_BYTES } from '../src/worker/utils/validation'

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

  it('allows same-origin browser mutations and non-browser publisher requests', async () => {
    const sameOrigin = await app.request(
      '/api/auth/register',
      registrationRequest({
        origin: 'http://localhost',
        'sec-fetch-site': 'same-origin',
      }),
      bindings,
    )
    const publisher = await app.request(
      '/api/auth/register',
      registrationRequest(),
      bindings,
    )

    expect(sameOrigin.status).toBe(201)
    expect(publisher.status).toBe(201)
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
    expect(openResponse.status).toBe(201)

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
    const registered = await app.request(
      '/api/auth/register',
      {
        ...registrationRequest(),
        body: JSON.stringify({
          email,
          password: 'ValidPassword123',
          firstName: 'Existing',
          lastName: 'Learner',
        }),
      },
      bindings,
    )
    expect(registered.status).toBe(201)

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
    const registered = await app.request(
      '/api/auth/register',
      registrationRequest(),
      bindings,
    )
    const cookie = registered.headers.get('set-cookie')?.split(';')[0]
    expect(cookie).toBeDefined()

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

  it('clears the server session with matching hardened cookie attributes', async () => {
    const registered = await app.request(
      '/api/auth/register',
      registrationRequest(),
      bindings,
    )
    const cookie = registered.headers.get('set-cookie')?.split(';')[0]
    expect(cookie).toBeDefined()

    const response = await app.request(
      '/api/auth/logout',
      { method: 'POST', headers: { cookie: cookie ?? '' } },
      bindings,
    )
    const cleared = response.headers.get('set-cookie')

    expect(response.status).toBe(200)
    expect(cleared).toContain('HttpOnly')
    expect(cleared).toContain('Secure')
    expect(cleared).toContain('SameSite=Lax')
    expect(cleared).toContain('Path=/')
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
