import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import {
  AUTH_COOKIE_NAME,
  clearAuthenticationCookie,
  setAuthenticationCookie,
} from '../auth/cookie'
import { requireAuthentication } from '../middleware/auth.middleware'
import {
  loginSchema,
  registrationSchema,
} from '../schemas/auth.schemas'
import {
  getPublicUser,
  loginUser,
  logoutSession,
  registerStudent,
} from '../services/auth.service'
import type { SessionMetadata } from '../types/auth'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody } from '../utils/validation'

export const authRoutes = new Hono<AppEnv>()

function optionalHeaderValue(
  value: string | undefined,
  maximumLength: number,
): string | null {
  if (value === undefined || value.length === 0) {
    return null
  }

  return value.slice(0, maximumLength)
}

function getSessionMetadata(context: {
  req: { header(name: string): string | undefined }
}): SessionMetadata {
  return {
    userAgent: optionalHeaderValue(
      context.req.header('user-agent'),
      512,
    ),
    ipAddress: optionalHeaderValue(
      context.req.header('cf-connecting-ip'),
      64,
    ),
  }
}

authRoutes.post('/register', async (context) => {
  const input = await parseJsonBody(context, registrationSchema)
  const result = await registerStudent(
    context.env.DB,
    input,
    getSessionMetadata(context),
  )

  setAuthenticationCookie(
    context,
    result.sessionToken,
    result.expiresAt,
  )

  return successResponse(context, { user: result.user }, 201)
})

authRoutes.post('/login', async (context) => {
  const input = await parseJsonBody(context, loginSchema)
  const result = await loginUser(
    context.env.DB,
    input,
    getSessionMetadata(context),
  )

  setAuthenticationCookie(
    context,
    result.sessionToken,
    result.expiresAt,
  )

  return successResponse(context, { user: result.user })
})

authRoutes.post('/logout', async (context) => {
  const token = getCookie(context, AUTH_COOKIE_NAME)

  if (token !== undefined && token.length > 0) {
    await logoutSession(context.env.DB, token)
  }

  clearAuthenticationCookie(context)

  return successResponse(context, { loggedOut: true })
})

authRoutes.get('/me', requireAuthentication, (context) =>
  successResponse(context, {
    user: getPublicUser(context.get('authUser')),
  }),
)
