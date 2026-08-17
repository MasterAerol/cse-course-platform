import { Hono } from 'hono'

import { lessonIdParamsSchema } from '../../schemas/admin/course-admin.schemas'
import {
  ageProblemsTeachingSystemReconcileSchema,
  averageTeachingSystemReconcileSchema,
  decimalsTeachingSystemReconcileSchema,
  lessonBlockCreateSchema,
  numberProblemsTeachingSystemReconcileSchema,
  fractionsTeachingSystemReconcileSchema,
  lessonBlockIdParamsSchema,
  lessonBlockUpdateSchema,
  percentageGuidedTeachingRepairSchema,
  percentageTeachingSystemReconcileSchema,
  ratioProportionTeachingSystemReconcileSchema,
  workRateTeachingSystemReconcileSchema,
} from '../../schemas/admin/content-admin.schemas'
import {
  createAdminLessonBlock,
  deleteAdminLessonBlock,
  getAdminLessonBlocks,
  moveLessonBlock,
  repairPercentageGuidedTeaching,
  reconcileAgeProblemsTeachingSystemLesson,
  reconcileAverageTeachingSystemLesson,
  reconcileNumberProblemsTeachingSystemLesson,
  reconcileDecimalsTeachingSystemLesson,
  reconcileFractionsTeachingSystemLesson,
  reconcilePercentageTeachingSystemLesson,
  reconcileRatioProportionTeachingSystemLesson,
  reconcileWorkRateTeachingSystemLesson,
  updateAdminLessonBlock,
} from '../../services/admin/admin-content.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../../utils/validation'

export const adminLessonBlockRoutes = new Hono<AppEnv>()

adminLessonBlockRoutes.get('/lessons/:lessonId/blocks', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )

  return successResponse(
    context,
    await getAdminLessonBlocks(context.env.DB, params.lessonId),
  )
})

adminLessonBlockRoutes.post('/lessons/:lessonId/blocks', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )
  const input = await parseJsonBody(context, lessonBlockCreateSchema)

  return successResponse(
    context,
    await createAdminLessonBlock(
      context.env.DB,
      context.get('authUser'),
      params.lessonId,
      input,
    ),
    201,
  )
})

adminLessonBlockRoutes.post(
  '/lessons/:lessonId/percentage-guided-teaching',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({
        lessonId: context.req.param('lessonId'),
      }),
    )
    const input = await parseJsonBody(
      context,
      percentageGuidedTeachingRepairSchema,
    )

    return successResponse(
      context,
      await repairPercentageGuidedTeaching(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input.content,
      ),
    )
  },
)

adminLessonBlockRoutes.put(
  '/lessons/:lessonId/fractions-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({
        lessonId: context.req.param('lessonId'),
      }),
    )
    const input = await parseJsonBody(
      context,
      fractionsTeachingSystemReconcileSchema,
    )

    return successResponse(
      context,
      await reconcileFractionsTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)

adminLessonBlockRoutes.put(
  '/lessons/:lessonId/decimals-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({
        lessonId: context.req.param('lessonId'),
      }),
    )
    const input = await parseJsonBody(
      context,
      decimalsTeachingSystemReconcileSchema,
    )

    return successResponse(
      context,
      await reconcileDecimalsTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)
adminLessonBlockRoutes.put(
  '/lessons/:lessonId/percentage-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({
        lessonId: context.req.param('lessonId'),
      }),
    )
    const input = await parseJsonBody(
      context,
      percentageTeachingSystemReconcileSchema,
    )

    return successResponse(
      context,
      await reconcilePercentageTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)
adminLessonBlockRoutes.put(
  '/lessons/:lessonId/ratio-proportion-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({ lessonId: context.req.param('lessonId') }),
    )
    const input = await parseJsonBody(context, ratioProportionTeachingSystemReconcileSchema)
    return successResponse(
      context,
      await reconcileRatioProportionTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)
adminLessonBlockRoutes.put(
  '/lessons/:lessonId/average-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({ lessonId: context.req.param('lessonId') }),
    )
    const input = await parseJsonBody(context, averageTeachingSystemReconcileSchema)
    return successResponse(
      context,
      await reconcileAverageTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)
adminLessonBlockRoutes.put(
  '/lessons/:lessonId/number-problems-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({ lessonId: context.req.param('lessonId') }),
    )
    const input = await parseJsonBody(context, numberProblemsTeachingSystemReconcileSchema)
    return successResponse(
      context,
      await reconcileNumberProblemsTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)

adminLessonBlockRoutes.put(
  '/lessons/:lessonId/age-problems-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({ lessonId: context.req.param('lessonId') }),
    )
    const input = await parseJsonBody(context, ageProblemsTeachingSystemReconcileSchema)
    return successResponse(
      context,
      await reconcileAgeProblemsTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)

adminLessonBlockRoutes.put(
  '/lessons/:lessonId/work-rate-teaching-system-v1',
  async (context) => {
    const params = parseValidatedInput(
      lessonIdParamsSchema.safeParse({ lessonId: context.req.param('lessonId') }),
    )
    const input = await parseJsonBody(context, workRateTeachingSystemReconcileSchema)
    return successResponse(
      context,
      await reconcileWorkRateTeachingSystemLesson(
        context.env.DB,
        context.get('authUser'),
        params.lessonId,
        input,
      ),
    )
  },
)

adminLessonBlockRoutes.patch('/lesson-blocks/:blockId', async (context) => {
  const params = parseValidatedInput(
    lessonBlockIdParamsSchema.safeParse({
      blockId: context.req.param('blockId'),
    }),
  )
  const input = await parseJsonBody(context, lessonBlockUpdateSchema)

  return successResponse(
    context,
    await updateAdminLessonBlock(
      context.env.DB,
      context.get('authUser'),
      params.blockId,
      input,
      context.get('requestId'),
    ),
  )
})

adminLessonBlockRoutes.delete('/lesson-blocks/:blockId', async (context) => {
  const params = parseValidatedInput(
    lessonBlockIdParamsSchema.safeParse({
      blockId: context.req.param('blockId'),
    }),
  )

  return successResponse(
    context,
    await deleteAdminLessonBlock(
      context.env.DB,
      context.get('authUser'),
      params.blockId,
    ),
  )
})

for (const direction of ['up', 'down'] as const) {
  adminLessonBlockRoutes.post(
    `/lesson-blocks/:blockId/move-${direction}`,
    async (context) => {
      const params = parseValidatedInput(
        lessonBlockIdParamsSchema.safeParse({
          blockId: context.req.param('blockId'),
        }),
      )

      return successResponse(
        context,
        await moveLessonBlock(
          context.env.DB,
          context.get('authUser'),
          params.blockId,
          direction,
        ),
      )
    },
  )
}
