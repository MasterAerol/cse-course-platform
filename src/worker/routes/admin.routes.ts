import { Hono } from 'hono'

import {
  requireAdmin,
  requireAuthentication,
} from '../middleware/auth.middleware'
import { operationalEnrollmentSchema } from '../schemas/course.schemas'
import { enrollStudentOperationally } from '../services/course.service'
import { getPublicUser } from '../services/auth.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'
import { parseJsonBody } from '../utils/validation'

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use('*', requireAuthentication, requireAdmin)

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
