import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireLearner } from '../middleware/learner.middleware'
import { requireLearnerMutationRateLimit } from '../middleware/rate-limit.middleware'
import { createFeedbackSchema } from '../schemas/feedback.schemas'
import { submitLearnerFeedback } from '../services/feedback.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody } from '../utils/validation'

export const feedbackRoutes = new Hono<AppEnv>()

feedbackRoutes.use('*', requireAuthentication, requireLearner)
feedbackRoutes.use('*', requireLearnerMutationRateLimit)

feedbackRoutes.post('/feedback', async (context) => {
  const input = await parseJsonBody(context, createFeedbackSchema)
  return successResponse(
    context,
    await submitLearnerFeedback(
      context.env.DB,
      context.get('authUser').internalUserId,
      input,
    ),
    201,
  )
})
