import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { lessonPublicIdSchema } from '../schemas/course.schemas'
import {
  practiceAnswerParamsSchema,
  practiceAttemptPublicIdSchema,
  practiceSetIdSchema,
  savePracticeAnswerSchema,
} from '../schemas/practice.schemas'
import {
  getLessonPracticeSummary,
  getPracticeAttempt,
  getPracticeAttemptResult,
  savePracticeAnswer,
  startPracticeAttempt,
  submitPracticeAttemptByPublicId,
} from '../services/practice.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import {
  parseJsonBody,
  parseValidatedInput,
} from '../utils/validation'

export const practiceRoutes = new Hono<AppEnv>()

practiceRoutes.use('*', requireAuthentication)

practiceRoutes.get('/lessons/:lessonPublicId/practice', async (context) => {
  const params = parseValidatedInput(
    lessonPublicIdSchema.safeParse({
      lessonPublicId: context.req.param('lessonPublicId'),
    }),
  )
  const result = await getLessonPracticeSummary(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.lessonPublicId,
  )

  return successResponse(context, result)
})

practiceRoutes.post('/practice-sets/:practiceSetId/attempts', async (context) => {
  const params = parseValidatedInput(
    practiceSetIdSchema.safeParse({
      practiceSetId: context.req.param('practiceSetId'),
    }),
  )
  const result = await startPracticeAttempt(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.practiceSetId,
  )

  return successResponse(context, result, 201)
})

practiceRoutes.get('/practice-attempts/:attemptPublicId', async (context) => {
  const params = parseValidatedInput(
    practiceAttemptPublicIdSchema.safeParse({
      attemptPublicId: context.req.param('attemptPublicId'),
    }),
  )
  const result = await getPracticeAttempt(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.attemptPublicId,
  )

  return successResponse(context, result)
})

practiceRoutes.put(
  '/practice-attempts/:attemptPublicId/answers/:questionId',
  async (context) => {
    const params = parseValidatedInput(
      practiceAnswerParamsSchema.safeParse({
        attemptPublicId: context.req.param('attemptPublicId'),
        questionId: context.req.param('questionId'),
      }),
    )
    const body = await parseJsonBody(context, savePracticeAnswerSchema)
    const result = await savePracticeAnswer(
      context.env.DB,
      context.get('authUser').internalUserId,
      {
        attemptPublicId: params.attemptPublicId,
        questionId: params.questionId,
        selectedChoiceId: body.selectedChoiceId,
      },
    )

    return successResponse(context, result)
  },
)

practiceRoutes.post(
  '/practice-attempts/:attemptPublicId/submit',
  async (context) => {
    const params = parseValidatedInput(
      practiceAttemptPublicIdSchema.safeParse({
        attemptPublicId: context.req.param('attemptPublicId'),
      }),
    )
    const result = await submitPracticeAttemptByPublicId(
      context.env.DB,
      context.get('authUser').internalUserId,
      params.attemptPublicId,
    )

    return successResponse(context, result)
  },
)

practiceRoutes.get(
  '/practice-attempts/:attemptPublicId/results',
  async (context) => {
    const params = parseValidatedInput(
      practiceAttemptPublicIdSchema.safeParse({
        attemptPublicId: context.req.param('attemptPublicId'),
      }),
    )
    const result = await getPracticeAttemptResult(
      context.env.DB,
      context.get('authUser').internalUserId,
      params.attemptPublicId,
    )

    return successResponse(context, result)
  },
)
