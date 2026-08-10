import { Hono } from 'hono'

import { lessonIdParamsSchema } from '../../schemas/admin/course-admin.schemas'
import {
  lessonBlockCreateSchema,
  lessonBlockIdParamsSchema,
  lessonBlockUpdateSchema,
  percentageGuidedTeachingRepairSchema,
} from '../../schemas/admin/content-admin.schemas'
import {
  createAdminLessonBlock,
  deleteAdminLessonBlock,
  getAdminLessonBlocks,
  moveLessonBlock,
  repairPercentageGuidedTeaching,
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
