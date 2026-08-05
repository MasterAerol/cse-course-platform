import { Hono } from 'hono'

import { createBetaStudentSchema } from '../../schemas/admin/beta-student.schemas'
import {
  createAdminBetaStudent,
  listAdminBetaStudents,
} from '../../services/admin/beta-student.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseJsonBody } from '../../utils/validation'

export const adminBetaStudentRoutes = new Hono<AppEnv>()

adminBetaStudentRoutes.get('/beta-students', async (context) =>
  successResponse(
    context,
    await listAdminBetaStudents(context.env.DB),
  ),
)

adminBetaStudentRoutes.post('/beta-students', async (context) => {
  const input = await parseJsonBody(context, createBetaStudentSchema)
  const result = await createAdminBetaStudent(
    context.env.DB,
    context.get('authUser'),
    input,
    context.get('requestId'),
  )

  return successResponse(context, result, 201)
})
