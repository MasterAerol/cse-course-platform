import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireLearner } from '../middleware/learner.middleware'
import { requireLearnerMutationRateLimit } from '../middleware/rate-limit.middleware'
import {
  createSmartRecoveryAttemptSchema,
  saveSmartRecoveryAnswerSchema,
  smartRecoveryAnswerParamsSchema,
  smartRecoveryAttemptParamsSchema,
  smartRecoverySkillParamsSchema,
} from '../schemas/smart-recovery.schemas'
import {
  getSmartRecoveryDashboard,
  getSmartRecoverySkillDetails,
} from '../services/smart-recovery.service'
import {
  createRecoveryAttempt,
  getRecoveryAttempt,
  getRecoveryAttemptResult,
  saveRecoveryAnswer,
  submitRecoveryAttempt,
} from '../services/smart-recovery-attempt.service'
import { getRecoveryHistory } from '../services/smart-recovery-history.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../utils/validation'

export const smartRecoveryRoutes = new Hono<AppEnv>()

smartRecoveryRoutes.use('*', requireAuthentication)
smartRecoveryRoutes.use('*', requireLearner)
smartRecoveryRoutes.use('*', requireLearnerMutationRateLimit)

smartRecoveryRoutes.get('/smart-recovery', async (context) =>
  successResponse(
    context,
    await getSmartRecoveryDashboard(
      context.env.DB,
      context.get('authUser').internalUserId,
    ),
  ),
)

smartRecoveryRoutes.get('/smart-recovery/history', async (context) =>
  successResponse(
    context,
    await getRecoveryHistory(
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
smartRecoveryRoutes.post('/smart-recovery/attempts', async (context) => {
  const body = await parseJsonBody(context, createSmartRecoveryAttemptSchema)
  return successResponse(
    context,
    await createRecoveryAttempt(
      context.env.DB,
      context.get('authUser').internalUserId,
      body.idempotencyKey,
    ),
    201,
  )
})

smartRecoveryRoutes.get(
  '/smart-recovery/attempts/:attemptPublicId',
  async (context) => {
    const params = parseValidatedInput(
      smartRecoveryAttemptParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await getRecoveryAttempt(
        context.env.DB,
        context.get('authUser').internalUserId,
        params.attemptPublicId,
      ),
    )
  },
)

smartRecoveryRoutes.put(
  '/smart-recovery/attempts/:attemptPublicId/answers/:snapshotPublicId',
  async (context) => {
    const params = parseValidatedInput(
      smartRecoveryAnswerParamsSchema.safeParse(context.req.param()),
    )
    const body = await parseJsonBody(context, saveSmartRecoveryAnswerSchema)
    return successResponse(
      context,
      await saveRecoveryAnswer(
        context.env.DB,
        context.get('authUser').internalUserId,
        {
          attemptPublicId: params.attemptPublicId,
          snapshotPublicId: params.snapshotPublicId,
          selectedChoicePublicId: body.selectedChoicePublicId,
        },
      ),
    )
  },
)

smartRecoveryRoutes.post(
  '/smart-recovery/attempts/:attemptPublicId/submit',
  async (context) => {
    const params = parseValidatedInput(
      smartRecoveryAttemptParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await submitRecoveryAttempt(
        context.env.DB,
        context.get('authUser').internalUserId,
        params.attemptPublicId,
      ),
    )
  },
)

smartRecoveryRoutes.get(
  '/smart-recovery/attempts/:attemptPublicId/result',
  async (context) => {
    const params = parseValidatedInput(
      smartRecoveryAttemptParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await getRecoveryAttemptResult(
        context.env.DB,
        context.get('authUser').internalUserId,
        params.attemptPublicId,
      ),
    )
  },
)

smartRecoveryRoutes.get(
  '/smart-recovery/attempts/:attemptPublicId/results',
  async (context) => {
    const params = parseValidatedInput(
      smartRecoveryAttemptParamsSchema.safeParse(context.req.param()),
    )
    return successResponse(
      context,
      await getRecoveryAttemptResult(
        context.env.DB,
        context.get('authUser').internalUserId,
        params.attemptPublicId,
      ),
    )
  },
)
