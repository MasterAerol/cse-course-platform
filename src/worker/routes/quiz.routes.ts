import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { lessonPublicIdSchema } from '../schemas/course.schemas'
import {
  answerParamsSchema,
  attemptPublicIdSchema,
  quizIdSchema,
  saveAnswerSchema,
} from '../schemas/quiz.schemas'
import {
  getLessonQuizSummary,
  getQuizAttempt,
  getQuizAttemptResult,
  saveQuizAnswer,
  startQuizAttempt,
  submitQuizAttempt,
} from '../services/quiz.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import {
  parseJsonBody,
  parseValidatedInput,
} from '../utils/validation'

export const quizRoutes = new Hono<AppEnv>()

quizRoutes.use('*', requireAuthentication)

quizRoutes.get('/lessons/:lessonPublicId/quiz', async (context) => {
  const params = parseValidatedInput(
    lessonPublicIdSchema.safeParse({
      lessonPublicId: context.req.param('lessonPublicId'),
    }),
  )
  const result = await getLessonQuizSummary(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.lessonPublicId,
  )

  return successResponse(context, result)
})

quizRoutes.post('/quizzes/:quizId/attempts', async (context) => {
  const params = parseValidatedInput(
    quizIdSchema.safeParse({
      quizId: context.req.param('quizId'),
    }),
  )
  const result = await startQuizAttempt(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.quizId,
  )

  return successResponse(context, result, 201)
})

quizRoutes.get('/quiz-attempts/:attemptPublicId', async (context) => {
  const params = parseValidatedInput(
    attemptPublicIdSchema.safeParse({
      attemptPublicId: context.req.param('attemptPublicId'),
    }),
  )
  const result = await getQuizAttempt(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.attemptPublicId,
  )

  return successResponse(context, result)
})

quizRoutes.put(
  '/quiz-attempts/:attemptPublicId/answers/:questionId',
  async (context) => {
    const params = parseValidatedInput(
      answerParamsSchema.safeParse({
        attemptPublicId: context.req.param('attemptPublicId'),
        questionId: context.req.param('questionId'),
      }),
    )
    const body = await parseJsonBody(context, saveAnswerSchema)
    const result = await saveQuizAnswer(
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

quizRoutes.post('/quiz-attempts/:attemptPublicId/submit', async (context) => {
  const params = parseValidatedInput(
    attemptPublicIdSchema.safeParse({
      attemptPublicId: context.req.param('attemptPublicId'),
    }),
  )
  const result = await submitQuizAttempt(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.attemptPublicId,
  )

  return successResponse(context, result)
})

quizRoutes.get('/quiz-attempts/:attemptPublicId/results', async (context) => {
  const params = parseValidatedInput(
    attemptPublicIdSchema.safeParse({
      attemptPublicId: context.req.param('attemptPublicId'),
    }),
  )
  const result = await getQuizAttemptResult(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.attemptPublicId,
  )

  return successResponse(context, result)
})
