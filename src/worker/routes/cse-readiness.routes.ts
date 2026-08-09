import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireLearner } from '../middleware/learner.middleware'
import { requireLearnerMutationRateLimit } from '../middleware/rate-limit.middleware'
import { getCseReadiness } from '../services/cse-readiness.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'

export const cseReadinessRoutes = new Hono<AppEnv>()
cseReadinessRoutes.use('*', requireAuthentication)
cseReadinessRoutes.use('*', requireLearner)
cseReadinessRoutes.use('*', requireLearnerMutationRateLimit)
cseReadinessRoutes.get('/readiness', async (context) => successResponse(context, await getCseReadiness(context.env.DB, context.get('authUser').internalUserId)))
