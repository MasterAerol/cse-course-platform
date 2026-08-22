import { Hono } from 'hono'

import {
  feedbackParamsSchema,
  feedbackQuerySchema,
  feedbackStatusSchema,
} from '../../schemas/feedback.schemas'
import {
  listAdminFeedback,
  updateAdminFeedbackStatus,
} from '../../services/feedback.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import {
  parseJsonBody,
  parseValidatedInput,
} from '../../utils/validation'

export const adminFeedbackRoutes = new Hono<AppEnv>()

adminFeedbackRoutes.get('/feedback', async (context) => {
  const query = parseValidatedInput(
    feedbackQuerySchema.safeParse(context.req.query()),
  )
  return successResponse(
    context,
    await listAdminFeedback(context.env.DB, query.status),
  )
})

adminFeedbackRoutes.patch('/feedback/:feedbackId', async (context) => {
  const params = parseValidatedInput(
    feedbackParamsSchema.safeParse(context.req.param()),
  )
  const input = await parseJsonBody(context, feedbackStatusSchema)
  return successResponse(
    context,
    await updateAdminFeedbackStatus(
      context.env.DB,
      context.get('authUser'),
      params.feedbackId,
      input.status,
    ),
  )
})
