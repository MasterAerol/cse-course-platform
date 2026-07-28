import { Hono } from 'hono'

import {
  courseIdParamsSchema,
  lessonCreateSchema,
  lessonIdParamsSchema,
  lessonUpdateSchema,
  subjectCreateSchema,
  subjectIdParamsSchema,
  subjectUpdateSchema,
  topicCreateSchema,
  topicIdParamsSchema,
  topicUpdateSchema,
} from '../../schemas/admin/course-admin.schemas'
import {
  createAdminLesson,
  createAdminSubject,
  createAdminTopic,
  moveLesson,
  moveSubject,
  moveTopic,
  updateAdminLesson,
  updateAdminSubject,
  updateAdminTopic,
} from '../../services/admin/admin-content.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../../utils/validation'

export const adminCurriculumRoutes = new Hono<AppEnv>()

adminCurriculumRoutes.post('/courses/:courseId/subjects', async (context) => {
  const params = parseValidatedInput(
    courseIdParamsSchema.safeParse({
      courseId: context.req.param('courseId'),
    }),
  )
  const input = await parseJsonBody(context, subjectCreateSchema)

  return successResponse(
    context,
    await createAdminSubject(
      context.env.DB,
      context.get('authUser'),
      params.courseId,
      input,
    ),
    201,
  )
})

adminCurriculumRoutes.patch('/subjects/:subjectId', async (context) => {
  const params = parseValidatedInput(
    subjectIdParamsSchema.safeParse({
      subjectId: context.req.param('subjectId'),
    }),
  )
  const input = await parseJsonBody(context, subjectUpdateSchema)

  return successResponse(
    context,
    await updateAdminSubject(
      context.env.DB,
      context.get('authUser'),
      params.subjectId,
      input,
    ),
  )
})

for (const direction of ['up', 'down'] as const) {
  adminCurriculumRoutes.post(
    `/subjects/:subjectId/move-${direction}`,
    async (context) => {
      const params = parseValidatedInput(
        subjectIdParamsSchema.safeParse({
          subjectId: context.req.param('subjectId'),
        }),
      )

      return successResponse(
        context,
        await moveSubject(
          context.env.DB,
          context.get('authUser'),
          params.subjectId,
          direction,
        ),
      )
    },
  )
}

adminCurriculumRoutes.post('/subjects/:subjectId/topics', async (context) => {
  const params = parseValidatedInput(
    subjectIdParamsSchema.safeParse({
      subjectId: context.req.param('subjectId'),
    }),
  )
  const input = await parseJsonBody(context, topicCreateSchema)

  return successResponse(
    context,
    await createAdminTopic(
      context.env.DB,
      context.get('authUser'),
      params.subjectId,
      input,
    ),
    201,
  )
})

adminCurriculumRoutes.patch('/topics/:topicId', async (context) => {
  const params = parseValidatedInput(
    topicIdParamsSchema.safeParse({
      topicId: context.req.param('topicId'),
    }),
  )
  const input = await parseJsonBody(context, topicUpdateSchema)

  return successResponse(
    context,
    await updateAdminTopic(
      context.env.DB,
      context.get('authUser'),
      params.topicId,
      input,
    ),
  )
})

for (const direction of ['up', 'down'] as const) {
  adminCurriculumRoutes.post(
    `/topics/:topicId/move-${direction}`,
    async (context) => {
      const params = parseValidatedInput(
        topicIdParamsSchema.safeParse({
          topicId: context.req.param('topicId'),
        }),
      )

      return successResponse(
        context,
        await moveTopic(
          context.env.DB,
          context.get('authUser'),
          params.topicId,
          direction,
        ),
      )
    },
  )
}

adminCurriculumRoutes.post('/topics/:topicId/lessons', async (context) => {
  const params = parseValidatedInput(
    topicIdParamsSchema.safeParse({
      topicId: context.req.param('topicId'),
    }),
  )
  const input = await parseJsonBody(context, lessonCreateSchema)

  return successResponse(
    context,
    await createAdminLesson(
      context.env.DB,
      context.get('authUser'),
      params.topicId,
      input,
    ),
    201,
  )
})

adminCurriculumRoutes.patch('/lessons/:lessonId', async (context) => {
  const params = parseValidatedInput(
    lessonIdParamsSchema.safeParse({
      lessonId: context.req.param('lessonId'),
    }),
  )
  const input = await parseJsonBody(context, lessonUpdateSchema)

  return successResponse(
    context,
    await updateAdminLesson(
      context.env.DB,
      context.get('authUser'),
      params.lessonId,
      input,
    ),
  )
})

for (const direction of ['up', 'down'] as const) {
  adminCurriculumRoutes.post(
    `/lessons/:lessonId/move-${direction}`,
    async (context) => {
      const params = parseValidatedInput(
        lessonIdParamsSchema.safeParse({
          lessonId: context.req.param('lessonId'),
        }),
      )

      return successResponse(
        context,
        await moveLesson(
          context.env.DB,
          context.get('authUser'),
          params.lessonId,
          direction,
        ),
      )
    },
  )
}
