import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireLearner } from '../middleware/learner.middleware'
import { smartRecoverySkillParamsSchema } from '../schemas/smart-recovery.schemas'
import {
  getSmartRecoveryDashboard,
  getSmartRecoverySkillDetails,
} from '../services/smart-recovery.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseValidatedInput } from '../utils/validation'

export const smartRecoveryRoutes = new Hono<AppEnv>()

smartRecoveryRoutes.use('*', requireAuthentication)
smartRecoveryRoutes.use('*', requireLearner)

smartRecoveryRoutes.get('/smart-recovery', async (context) =>
  successResponse(
    context,
    await getSmartRecoveryDashboard(
      context.env.DB,
      context.get('authUser').internalUserId,
    ),
  ),
)

smartRecoveryRoutes.get(
  '/smart-recovery/skills/:skillSlug',
  async (context) => {
    const { skillSlug } = parseValidatedInput(
      smartRecoverySkillParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await getSmartRecoverySkillDetails(
        context.env.DB,
        context.get('authUser').internalUserId,
        skillSlug,
      ),
    )
  },
)
