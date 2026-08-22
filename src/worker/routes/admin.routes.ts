import { Hono } from 'hono'

import {
  requireAdmin,
  requireAuthentication,
} from '../middleware/auth.middleware'
import { requireAdminCsrf } from '../middleware/admin-csrf.middleware'
import { requireAdminRateLimit } from '../middleware/rate-limit.middleware'
import { operationalEnrollmentSchema } from '../schemas/course.schemas'
import { enrollStudentOperationally } from '../services/course.service'
import { getPublicUser } from '../services/auth.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody } from '../utils/validation'
import { adminAssessmentRoutes } from './admin/assessment.routes'
import { adminBetaStudentRoutes } from './admin/beta-student.routes'
import { adminAuditRoutes } from './admin/audit.routes'
import { adminCommercialRoutes } from './admin/commercial.routes'
import { adminCourseRoutes } from './admin/course.routes'
import { adminCurriculumRoutes } from './admin/curriculum.routes'
import { adminDashboardRoutes } from './admin/dashboard.routes'
import { adminFeedbackRoutes } from './admin/feedback.routes'
import { adminLessonBlockRoutes } from './admin/lesson-block.routes'
import { adminSubjectAssessmentRoutes } from './admin/subject-assessment.routes'
import { adminMockExamRoutes } from './admin/mock-exam.routes'
import { adminQaStudentRoutes } from './admin/qa-student.routes'

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use('*', requireAuthentication, requireAdmin)
adminRoutes.use('*', requireAdminRateLimit)
adminRoutes.use('*', requireAdminCsrf)

adminRoutes.get('/auth-check', (context) =>
  successResponse(context, {
    authorized: true,
    user: getPublicUser(context.get('authUser')),
  }),
)

adminRoutes.post('/enrollments', async (context) => {
  const input = await parseJsonBody(context, operationalEnrollmentSchema)
  const result = await enrollStudentOperationally(context.env.DB, input)

  return successResponse(context, result, 201)
})

adminRoutes.route('/dashboard', adminDashboardRoutes)
adminRoutes.route('/courses', adminCourseRoutes)
adminRoutes.route('/', adminCurriculumRoutes)
adminRoutes.route('/', adminLessonBlockRoutes)
adminRoutes.route('/', adminAssessmentRoutes)
adminRoutes.route('/', adminBetaStudentRoutes)
adminRoutes.route('/', adminAuditRoutes)
adminRoutes.route('/', adminCommercialRoutes)
adminRoutes.route('/', adminFeedbackRoutes)
adminRoutes.route('/', adminSubjectAssessmentRoutes)
adminRoutes.route('/', adminMockExamRoutes)
adminRoutes.route('/', adminQaStudentRoutes)
