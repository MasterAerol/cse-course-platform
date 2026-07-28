import { Hono } from 'hono'

import { lessonIdParamsSchema } from '../../schemas/admin/course-admin.schemas'
import {
  fixedQuestionInputSchema,
  practiceQuestionIdParamsSchema,
  practiceSetIdParamsSchema,
  practiceSetInputSchema,
  quizIdParamsSchema,
  quizInputSchema,
  quizQuestionIdParamsSchema,
  quizQuestionInputSchema,
} from '../../schemas/admin/content-admin.schemas'
import {
  getAdminPracticeSet,
  getAdminQuiz,
  getSupportedPracticeGenerators,
  moveAdminPracticeQuestion,
  moveAdminQuizQuestion,
  saveAdminPracticeQuestion,
  saveAdminPracticeSet,
  saveAdminQuiz,
  saveAdminQuizQuestion,
} from '../../services/admin/admin-content.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../../utils/validation'

export const adminAssessmentRoutes = new Hono<AppEnv>()

adminAssessmentRoutes.get('/practice-generators', (context) =>
  successResponse(context, getSupportedPracticeGenerators()),
)

adminAssessmentRoutes.get('/lessons/:lessonId/practice-set', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )

  return successResponse(
    context,
    await getAdminPracticeSet(context.env.DB, params.lessonId),
  )
})

adminAssessmentRoutes.put('/lessons/:lessonId/practice-set', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )
  const input = await parseJsonBody(context, practiceSetInputSchema)

  return successResponse(
    context,
    await saveAdminPracticeSet(
      context.env.DB,
      context.get('authUser'),
      params.lessonId,
      input,
    ),
  )
})

adminAssessmentRoutes.post(
  '/practice-sets/:practiceSetId/questions',
  async (context) => {
    const params = parseValidatedInput(
      practiceSetIdParamsSchema.safeParse({
        practiceSetId: context.req.param('practiceSetId'),
      }),
    )
    const input = await parseJsonBody(context, fixedQuestionInputSchema)

    return successResponse(
      context,
      await saveAdminPracticeQuestion(
        context.env.DB,
        context.get('authUser'),
        params.practiceSetId,
        null,
        input,
      ),
      201,
    )
  },
)

adminAssessmentRoutes.patch(
  '/practice-questions/:practiceQuestionId',
  async (context) => {
    const params = parseValidatedInput(
      practiceQuestionIdParamsSchema.safeParse({
        practiceQuestionId: context.req.param('practiceQuestionId'),
      }),
    )
    const input = await parseJsonBody(context, fixedQuestionInputSchema)

    return successResponse(
      context,
      await saveAdminPracticeQuestion(
        context.env.DB,
        context.get('authUser'),
        0,
        params.practiceQuestionId,
        input,
      ),
    )
  },
)

for (const direction of ['up', 'down'] as const) {
  adminAssessmentRoutes.post(
    `/practice-questions/:practiceQuestionId/move-${direction}`,
    async (context) => {
      const params = parseValidatedInput(
        practiceQuestionIdParamsSchema.safeParse({
          practiceQuestionId: context.req.param('practiceQuestionId'),
        }),
      )

      return successResponse(
        context,
        await moveAdminPracticeQuestion(
          context.env.DB,
          context.get('authUser'),
          params.practiceQuestionId,
          direction,
        ),
      )
    },
  )
}

adminAssessmentRoutes.get('/lessons/:lessonId/quiz', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )

  return successResponse(
    context,
    await getAdminQuiz(context.env.DB, params.lessonId),
  )
})

adminAssessmentRoutes.put('/lessons/:lessonId/quiz', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )
  const input = await parseJsonBody(context, quizInputSchema)

  return successResponse(
    context,
    await saveAdminQuiz(
      context.env.DB,
      context.get('authUser'),
      params.lessonId,
      input,
    ),
  )
})

adminAssessmentRoutes.post('/quizzes/:quizId/questions', async (context) => {
  const params = parseValidatedInput(
    quizIdParamsSchema.safeParse({
      quizId: context.req.param('quizId'),
    }),
  )
  const input = await parseJsonBody(context, quizQuestionInputSchema)

  return successResponse(
    context,
    await saveAdminQuizQuestion(
      context.env.DB,
      context.get('authUser'),
      params.quizId,
      null,
      input,
    ),
    201,
  )
})

adminAssessmentRoutes.patch('/questions/:questionId', async (context) => {
  const params = parseValidatedInput(
    quizQuestionIdParamsSchema.safeParse({
      questionId: context.req.param('questionId'),
    }),
  )
  const input = await parseJsonBody(context, quizQuestionInputSchema)

  return successResponse(
    context,
    await saveAdminQuizQuestion(
      context.env.DB,
      context.get('authUser'),
      0,
      params.questionId,
      input,
    ),
  )
})

for (const direction of ['up', 'down'] as const) {
  adminAssessmentRoutes.post(
    `/questions/:questionId/move-${direction}`,
    async (context) => {
      const params = parseValidatedInput(
        quizQuestionIdParamsSchema.safeParse({
          questionId: context.req.param('questionId'),
        }),
      )

      return successResponse(
        context,
        await moveAdminQuizQuestion(
          context.env.DB,
          context.get('authUser'),
          params.questionId,
          direction,
        ),
      )
    },
  )
}
