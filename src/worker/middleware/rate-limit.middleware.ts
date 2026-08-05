import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types/app'
import { AppError } from '../utils/app-error'

type RateLimitBindingName =
  | 'LOGIN_IP_RATE_LIMITER'
  | 'LOGIN_ACCOUNT_RATE_LIMITER'
  | 'REGISTRATION_RATE_LIMITER'
  | 'ATTEMPT_RATE_LIMITER'
  | 'AUTOSAVE_RATE_LIMITER'
  | 'ADMIN_RATE_LIMITER'

const RETRY_AFTER_SECONDS = 60

function rateLimitUnavailable(): AppError {
  return new AppError(
    503,
    'SECURITY_CONFIGURATION_UNAVAILABLE',
    'The request cannot be processed right now. Please try again shortly.',
  )
}

export function getClientAddress(context: Context<AppEnv>): string {
  return context.req.header('cf-connecting-ip') ?? 'unknown-client'
}

export async function hashRateLimitKey(
  scope: string,
  value: string,
): Promise<string> {
  const input = new TextEncoder().encode(`${scope}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', input)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function enforceRateLimit(
  context: Context<AppEnv>,
  bindingName: RateLimitBindingName,
  key: string,
  category: string,
): Promise<void> {
  const limiter = context.env[bindingName]

  if (limiter === undefined) {
    if (context.env.ENVIRONMENT === 'production') {
      throw rateLimitUnavailable()
    }

    return
  }

  let success: boolean

  try {
    success = (await limiter.limit({ key })).success
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        message: 'Rate-limit check failed',
        requestId: context.get('requestId'),
        category,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }),
    )

    if (context.env.ENVIRONMENT === 'production') {
      throw rateLimitUnavailable()
    }

    return
  }

  if (!success) {
    context.header('Retry-After', String(RETRY_AFTER_SECONDS))
    console.warn(
      JSON.stringify({
        message: 'Request rate limited',
        requestId: context.get('requestId'),
        category,
      }),
    )
    throw new AppError(
      429,
      'RATE_LIMITED',
      'Too many requests. Please try again shortly.',
    )
  }
}

function learnerRateLimitCategory(
  path: string,
  method: string,
): { binding: RateLimitBindingName; operation: string } | null {
  if (method === 'PUT' && path.includes('/answers/')) {
    return { binding: 'AUTOSAVE_RATE_LIMITER', operation: 'answer-save' }
  }
  if (method === 'PUT' && path.includes('/review-flags/')) {
    return { binding: 'AUTOSAVE_RATE_LIMITER', operation: 'review-flag' }
  }
  if (method === 'POST' && path.endsWith('/attempts')) {
    return { binding: 'ATTEMPT_RATE_LIMITER', operation: 'attempt-create' }
  }
  if (method === 'POST' && path.endsWith('/submit')) {
    return { binding: 'ATTEMPT_RATE_LIMITER', operation: 'attempt-submit' }
  }
  if (method === 'POST' && path.endsWith('/start')) {
    return { binding: 'ATTEMPT_RATE_LIMITER', operation: 'attempt-start' }
  }

  return null
}

function learnerRouteFamily(path: string): string {
  if (path.includes('/mock-')) return 'mock'
  if (path.includes('/subject-assessment')) return 'subject-assessment'
  if (path.includes('/practice-')) return 'practice'
  if (path.includes('/quiz')) return 'quiz'
  return 'learning'
}

export const requireLearnerMutationRateLimit = createMiddleware<AppEnv>(
  async (context, next) => {
    const category = learnerRateLimitCategory(
      context.req.path,
      context.req.method.toUpperCase(),
    )

    if (category !== null) {
      const principal = context.get('authUser')
      await enforceRateLimit(
        context,
        category.binding,
        `${principal.id}:${learnerRouteFamily(context.req.path)}:${category.operation}`,
        category.operation,
      )
    }

    await next()
  },
)

export const requireAdminRateLimit = createMiddleware<AppEnv>(
  async (context, next) => {
    await enforceRateLimit(
      context,
      'ADMIN_RATE_LIMITER',
      `admin:${context.get('authUser').id}`,
      'admin-api',
    )
    await next()
  },
)