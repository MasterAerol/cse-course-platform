import { Hono } from 'hono'

import {
  courseCreateSchema,
  courseIdParamsSchema,
  courseUpdateSchema,
} from '../../schemas/admin/course-admin.schemas'
import {
  createAdminCourse,
  getAdminCourseDetail,
  getAdminCourses,
  updateAdminCourse,
} from '../../services/admin/admin-content.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody, parseValidatedInput } from '../../utils/validation'

export const adminCourseRoutes = new Hono<AppEnv>()

adminCourseRoutes.get('/', async (context) =>
  successResponse(context, await getAdminCourses(context.env.DB)),
)

adminCourseRoutes.post('/', async (context) => {
  const input = await parseJsonBody(context, courseCreateSchema)
  const result = await createAdminCourse(
    context.env.DB,
    context.get('authUser'),
    input,
  )

  return successResponse(context, result, 201)
})

adminCourseRoutes.get('/:courseId', async (context) => {
  const params = parseValidatedInput(
    courseIdParamsSchema.safeParse({
      courseId: context.req.param('courseId'),
    }),
  )

  return successResponse(
    context,
    await getAdminCourseDetail(context.env.DB, params.courseId),
  )
})

adminCourseRoutes.patch('/:courseId', async (context) => {
  const params = parseValidatedInput(
    courseIdParamsSchema.safeParse({
      courseId: context.req.param('courseId'),
    }),
  )
  const input = await parseJsonBody(context, courseUpdateSchema)
  const result = await updateAdminCourse(
    context.env.DB,
    context.get('authUser'),
    params.courseId,
    input,
  )

  return successResponse(context, result)
})
