import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types/app'
import { AppError } from '../utils/app-error'

export const requireLearner = createMiddleware<AppEnv>(
  async (context, next) => {
    if (context.get('authUser').role !== 'student') {
      throw new AppError(
        403,
        'LEARNER_ACCESS_REQUIRED',
        'Learner access is required.',
      )
    }
    await next()
  },
)
