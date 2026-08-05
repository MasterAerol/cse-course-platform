import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types/app'
import { AppError } from '../utils/app-error'

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const contentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
].join('; ')

export const applyApiSecurityHeaders = createMiddleware<AppEnv>(
  async (context, next) => {
    await next()

    context.header('Cache-Control', 'no-store')
    context.header('Content-Security-Policy', contentSecurityPolicy)
    context.header('Cross-Origin-Opener-Policy', 'same-origin')
    context.header('Cross-Origin-Resource-Policy', 'same-origin')
    context.header('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
    context.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    context.header('X-Content-Type-Options', 'nosniff')
    context.header('X-Frame-Options', 'DENY')

    if (context.env.ENVIRONMENT === 'production') {
      context.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      )
    }
  },
)

export const requireSameOriginMutation = createMiddleware<AppEnv>(
  async (context, next) => {
    if (!mutatingMethods.has(context.req.method.toUpperCase())) {
      await next()
      return
    }

    const requestOrigin = new URL(context.req.url).origin
    const origin = context.req.header('origin')
    const fetchSite = context.req.header('sec-fetch-site')

    if (
      (origin !== undefined && origin !== requestOrigin) ||
      fetchSite === 'cross-site'
    ) {
      throw new AppError(
        403,
        'ORIGIN_NOT_ALLOWED',
        'Cross-origin mutations are not allowed.',
      )
    }

    await next()
  },
)