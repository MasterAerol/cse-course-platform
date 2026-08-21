import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireCommercialFeature } from '../middleware/commercial-access.middleware'
import { requireLearner } from '../middleware/learner.middleware'
import { requireLearnerMutationRateLimit } from '../middleware/rate-limit.middleware'
import {
  mistakeNotebookEntryParamsSchema,
  mistakeNotebookListQuerySchema,
} from '../schemas/mistake-notebook.schemas'
import {
  getMistakeNotebookEntry,
  getMistakeNotebookPage,
  getMistakeNotebookSummary,
} from '../services/mistake-notebook.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseValidatedInput } from '../utils/validation'

export const mistakeNotebookRoutes = new Hono<AppEnv>()

mistakeNotebookRoutes.use('*', requireAuthentication)
mistakeNotebookRoutes.use('*', requireCommercialFeature('mistake_notebook'))
mistakeNotebookRoutes.use('*', requireLearner)
mistakeNotebookRoutes.use('*', requireLearnerMutationRateLimit)

mistakeNotebookRoutes.get('/mistake-notebook/summary', async (context) =>
  successResponse(
    context,
    await getMistakeNotebookSummary(
      context.env.DB,
      context.get('authUser').internalUserId,
    ),
  ),
)

mistakeNotebookRoutes.get('/mistake-notebook', async (context) => {
  const query = parseValidatedInput(
    mistakeNotebookListQuerySchema.safeParse(context.req.query()),
  )
  return successResponse(
    context,
    await getMistakeNotebookPage(
      context.env.DB,
      context.get('authUser').internalUserId,
      {
        page: query.page,
        limit: query.limit,
        filters: {
          subject: query.subject,
          source: query.source,
          skill: query.skill,
          from: query.from,
          to: query.to,
          unansweredOnly: query.unansweredOnly,
          repeatedPatternOnly: query.repeatedPatternOnly,
        },
      },
    ),
  )
})

mistakeNotebookRoutes.get('/mistake-notebook/:entryId', async (context) => {
  const { entryId } = parseValidatedInput(
    mistakeNotebookEntryParamsSchema.safeParse(context.req.param()),
  )
  return successResponse(
    context,
    await getMistakeNotebookEntry(
      context.env.DB,
      context.get('authUser').internalUserId,
      entryId,
    ),
  )
})