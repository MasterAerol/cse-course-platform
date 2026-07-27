import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { courseSlugSchema } from '../schemas/course.schemas'
import {
  getStudentCourseProgress,
  getStudentDashboard,
} from '../services/course.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseValidatedInput } from '../utils/validation'

export const studentRoutes = new Hono<AppEnv>()

studentRoutes.use('*', requireAuthentication)

studentRoutes.get('/dashboard', async (context) => {
  const result = await getStudentDashboard(
    context.env.DB,
    context.get('authUser').internalUserId,
  )

  return successResponse(context, result)
})

studentRoutes.get('/courses/:courseSlug/progress', async (context) => {
  const params = parseValidatedInput(
    courseSlugSchema.safeParse({
      courseSlug: context.req.param('courseSlug'),
    }),
  )
  const result = await getStudentCourseProgress(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.courseSlug,
  )

  return successResponse(context, result)
})
