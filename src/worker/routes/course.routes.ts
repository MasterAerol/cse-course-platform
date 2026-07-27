import { Hono } from 'hono'

import { optionalAuthentication } from '../middleware/auth.middleware'
import { courseSlugSchema } from '../schemas/course.schemas'
import {
  getCourseDetail,
  listCourses,
} from '../services/course.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseValidatedInput } from '../utils/validation'

export const courseRoutes = new Hono<AppEnv>()

courseRoutes.use('*', optionalAuthentication)

courseRoutes.get('/', async (context) => {
  const user = context.get('authUser')
  const result = await listCourses(
    context.env.DB,
    user?.internalUserId ?? null,
  )

  return successResponse(context, result)
})

courseRoutes.get('/:courseSlug', async (context) => {
  const params = parseValidatedInput(
    courseSlugSchema.safeParse({
      courseSlug: context.req.param('courseSlug'),
    }),
  )
  const user = context.get('authUser')
  const result = await getCourseDetail(
    context.env.DB,
    params.courseSlug,
    user?.internalUserId ?? null,
  )

  return successResponse(context, result)
})
