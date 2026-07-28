import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types/app'
import { AppError } from '../utils/app-error'

export const ADMIN_CSRF_HEADER = 'x-cse-admin-csrf'
export const ADMIN_CSRF_HEADER_VALUE = 'same-origin-admin-mutation'

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const requireAdminCsrf = createMiddleware<AppEnv>(
  async (context, next) => {
    if (!mutatingMethods.has(context.req.method.toUpperCase())) {
      await next()
      return
    }

    const token = context.req.header(ADMIN_CSRF_HEADER)

    if (token !== ADMIN_CSRF_HEADER_VALUE) {
      throw new AppError(
        403,
        'CSRF_TOKEN_INVALID',
        'Admin mutations require a valid same-origin CSRF header.',
      )
    }

    await next()
  },
)
