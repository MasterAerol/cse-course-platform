import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'

import { AUTH_COOKIE_NAME } from '../auth/cookie'
import { authenticateSession } from '../services/auth.service'
import type { AppEnv } from '../types/app'
import { AppError } from '../utils/app-error'

export const requireAuthentication = createMiddleware<AppEnv>(
  async (context, next) => {
    const token = getCookie(context, AUTH_COOKIE_NAME)

    if (token === undefined || token.length === 0) {
      throw new AppError(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
      )
    }

    const principal = await authenticateSession(context.env.DB, token)
    context.set('authUser', principal)

    await next()
  },
)

export const optionalAuthentication = createMiddleware<AppEnv>(
  async (context, next) => {
    const token = getCookie(context, AUTH_COOKIE_NAME)

    if (token !== undefined && token.length > 0) {
      try {
        const principal = await authenticateSession(context.env.DB, token)
        context.set('authUser', principal)
      } catch (error: unknown) {
        if (
          error instanceof AppError &&
          error.code === 'UNAUTHENTICATED'
        ) {
          await next()
          return
        }

        throw error
      }
    }

    await next()
  },
)

export const requireAdmin = createMiddleware<AppEnv>(
  async (context, next) => {
    const principal = context.get('authUser')

    if (principal.role !== 'admin') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Administrator access is required.',
      )
    }

    await next()
  },
)
