import { Hono } from 'hono'

import { requireAuthentication } from '../middleware/auth.middleware'
import { requireCommercialFeature } from '../middleware/commercial-access.middleware'
import {
  courseSlugSchema,
  lessonPublicIdSchema,
} from '../schemas/course.schemas'
import {
  getStudentCourseCurriculum,
  getStudentCourseProgress,
  getStudentDashboard,
  getStudentLessonDetail,
  startStudentLesson,
  completeStudentLesson,
} from '../services/course.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseValidatedInput } from '../utils/validation'

export const studentRoutes = new Hono<AppEnv>()

studentRoutes.use('*', requireAuthentication)
studentRoutes.use('/courses/:courseSlug/curriculum', requireCommercialFeature('full_curriculum'))
studentRoutes.use('/lessons/*', requireCommercialFeature('full_curriculum'))

studentRoutes.get('/dashboard', async (context) => {
  const result = await getStudentDashboard(
    context.env.DB,
    context.get('authUser').internalUserId,
  )

  return successResponse(context, result)
})

studentRoutes.get('/courses/:courseSlug/curriculum', async (context) => {
  const params = parseValidatedInput(
    courseSlugSchema.safeParse({
      courseSlug: context.req.param('courseSlug'),
    }),
  )
  const result = await getStudentCourseCurriculum(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.courseSlug,
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

studentRoutes.get('/lessons/:lessonPublicId', async (context) => {
  const params = parseValidatedInput(
    lessonPublicIdSchema.safeParse({
      lessonPublicId: context.req.param('lessonPublicId'),
    }),
  )
  const result = await getStudentLessonDetail(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.lessonPublicId,
  )

  return successResponse(context, result)
})

studentRoutes.post('/lessons/:lessonPublicId/start', async (context) => {
  const params = parseValidatedInput(
    lessonPublicIdSchema.safeParse({
      lessonPublicId: context.req.param('lessonPublicId'),
    }),
  )
  const result = await startStudentLesson(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.lessonPublicId,
  )

  return successResponse(context, result)
})

studentRoutes.post('/lessons/:lessonPublicId/complete', async (context) => {
  const params = parseValidatedInput(
    lessonPublicIdSchema.safeParse({
      lessonPublicId: context.req.param('lessonPublicId'),
    }),
  )
  const result = await completeStudentLesson(
    context.env.DB,
    context.get('authUser').internalUserId,
    params.lessonPublicId,
  )

  return successResponse(context, result)
})
