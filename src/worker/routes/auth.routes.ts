import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import { clearAuthenticationCookie, AUTH_COOKIE_NAME, setAuthenticationCookie } from '../auth/cookie'
import { verifyGoogleIdToken } from '../auth/google'
import { getGoogleClientId } from '../config/google'
import { getRegistrationMode } from '../config/registration'
import { requireAuthentication } from '../middleware/auth.middleware'
import {
  enforceRateLimit,
  getClientAddress,
  hashRateLimitKey,
} from '../middleware/rate-limit.middleware'
import {
  changePasswordSchema,
  googleCredentialSchema,
  loginSchema,
  registrationSchema,
} from '../schemas/auth.schemas'
import {
  authenticateWithGoogle,
  changePassword,
  connectGoogleIdentity,
  getPublicUser,
  loginUser,
  logoutSession,
  registerStudent,
} from '../services/auth.service'
import { isEffectivePublicSignupEnabled } from '../services/commercial.service'
import type { AppEnv } from '../types/app'
import type { SessionMetadata } from '../types/auth'
import { AppError } from '../utils/app-error'
import { successResponse } from '../utils/responses'
import { parseJsonBody } from '../utils/validation'

export const authRoutes = new Hono<AppEnv>()

function optionalHeaderValue(
  value: string | undefined,
  maximumLength: number,
): string | null {
  if (value === undefined || value.length === 0) return null
  return value.slice(0, maximumLength)
}

function getSessionMetadata(context: {
  req: { header(name: string): string | undefined }
}): SessionMetadata {
  return {
    userAgent: optionalHeaderValue(context.req.header('user-agent'), 512),
    ipAddress: optionalHeaderValue(context.req.header('cf-connecting-ip'), 64),
  }
}

function requireGoogleClientId(context: { env: AppEnv['Bindings'] }): string {
  const clientId = getGoogleClientId(context.env)
  if (clientId === null) {
    throw new AppError(
      503,
      'GOOGLE_AUTH_UNAVAILABLE',
      'Google sign-in is temporarily unavailable. Use your password or try again later.',
    )
  }
  return clientId
}

authRoutes.post('/register', async (context) => {
  const registrationEnabled = await isEffectivePublicSignupEnabled(
    context.env.DB,
    getRegistrationMode(context.env),
  )

  if (!registrationEnabled) {
    throw new AppError(
      403,
      'REGISTRATION_CLOSED',
      'Registration is currently limited to approved private-beta learners.',
    )
  }

  await enforceRateLimit(
    context,
    'REGISTRATION_RATE_LIMITER',
    `registration:${getClientAddress(context)}`,
    'registration',
  )

  const input = await parseJsonBody(context, registrationSchema)
  const result = await registerStudent(
    context.env.DB,
    input,
    getSessionMetadata(context),
  )

  setAuthenticationCookie(context, result.sessionToken, result.expiresAt)
  return successResponse(context, { user: result.user }, 201)
})

authRoutes.post('/login', async (context) => {
  const input = await parseJsonBody(context, loginSchema)
  const accountKey = await hashRateLimitKey('login-account', input.email)

  await Promise.all([
    enforceRateLimit(
      context,
      'LOGIN_IP_RATE_LIMITER',
      `login:${getClientAddress(context)}`,
      'login-ip',
    ),
    enforceRateLimit(
      context,
      'LOGIN_ACCOUNT_RATE_LIMITER',
      accountKey,
      'login-account',
    ),
  ])

  const result = await loginUser(
    context.env.DB,
    input,
    getSessionMetadata(context),
  )

  setAuthenticationCookie(context, result.sessionToken, result.expiresAt)
  return successResponse(context, { user: result.user })
})

authRoutes.post('/google', async (context) => {
  const clientId = requireGoogleClientId(context)

  await enforceRateLimit(
    context,
    'LOGIN_IP_RATE_LIMITER',
    `google:${getClientAddress(context)}`,
    'google-ip',
  )

  const input = await parseJsonBody(context, googleCredentialSchema)
  const identity = await verifyGoogleIdToken(input.credential, clientId)
  const accountKey = await hashRateLimitKey(
    'google-login-account',
    identity.subject,
  )
  await enforceRateLimit(
    context,
    'LOGIN_ACCOUNT_RATE_LIMITER',
    accountKey,
    'google-account',
  )

  const registrationEnabled = await isEffectivePublicSignupEnabled(
    context.env.DB,
    getRegistrationMode(context.env),
  )
  const result = await authenticateWithGoogle(
    context.env.DB,
    identity,
    getSessionMetadata(context),
    {
      registrationEnabled,
      beforeCreate: () =>
        enforceRateLimit(
          context,
          'REGISTRATION_RATE_LIMITER',
          `google-registration:${getClientAddress(context)}`,
          'google-registration',
        ),
    },
  )

  setAuthenticationCookie(context, result.sessionToken, result.expiresAt)
  return successResponse(context, { user: result.user })
})

authRoutes.post(
  '/google/link',
  requireAuthentication,
  async (context) => {
    const clientId = requireGoogleClientId(context)
    const principal = context.get('authUser')
    const accountKey = await hashRateLimitKey(
      'google-link-account',
      principal.id,
    )

    await Promise.all([
      enforceRateLimit(
        context,
        'LOGIN_IP_RATE_LIMITER',
        `google-link:${getClientAddress(context)}`,
        'google-link-ip',
      ),
      enforceRateLimit(
        context,
        'LOGIN_ACCOUNT_RATE_LIMITER',
        accountKey,
        'google-link-account',
      ),
    ])

    const input = await parseJsonBody(context, googleCredentialSchema)
    const identity = await verifyGoogleIdToken(input.credential, clientId)
    const user = await connectGoogleIdentity(
      context.env.DB,
      principal,
      identity,
    )

    return successResponse(context, { user })
  },
)

authRoutes.post('/logout', async (context) => {
  const token = getCookie(context, AUTH_COOKIE_NAME)
  if (token !== undefined && token.length > 0) {
    await logoutSession(context.env.DB, token)
  }

  clearAuthenticationCookie(context)
  return successResponse(context, { loggedOut: true })
})

authRoutes.post('/change-password', requireAuthentication, async (context) => {
  const principal = context.get('authUser')
  const currentSessionToken = getCookie(context, AUTH_COOKIE_NAME)
  if (
    currentSessionToken === undefined ||
    currentSessionToken.length === 0
  ) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Authentication is required.',
    )
  }

  const accountKey = await hashRateLimitKey(
    'password-change-account',
    principal.id,
  )
  await Promise.all([
    enforceRateLimit(
      context,
      'LOGIN_IP_RATE_LIMITER',
      `password-change:${getClientAddress(context)}`,
      'password-change-ip',
    ),
    enforceRateLimit(
      context,
      'LOGIN_ACCOUNT_RATE_LIMITER',
      accountKey,
      'password-change-account',
    ),
  ])

  const input = await parseJsonBody(context, changePasswordSchema)
  await changePassword(
    context.env.DB,
    principal,
    currentSessionToken,
    input,
  )

  return successResponse(context, {
    passwordUpdated: true,
    otherSessionsRevoked: true,
  })
})

authRoutes.get('/me', requireAuthentication, (context) =>
  successResponse(context, {
    user: getPublicUser(context.get('authUser')),
  }),
)
