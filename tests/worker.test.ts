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
