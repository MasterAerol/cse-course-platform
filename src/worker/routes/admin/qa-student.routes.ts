import { Hono } from 'hono'

import {
  configureQaStudentSchema,
  inspectQaStudentSchema,
} from '../../schemas/admin/qa-student.schemas'
import {
  configureAdminQaStudent,
  inspectAdminQaStudent,
} from '../../services/admin/qa-student.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import {
  parseJsonBody,
  parseValidatedInput,
} from '../../utils/validation'

export const adminQaStudentRoutes = new Hono<AppEnv>()

adminQaStudentRoutes.get('/qa-students/target', async (context) => {
  const { email } = parseValidatedInput(
    inspectQaStudentSchema.safeParse(context.req.query()),
  )
  return successResponse(
    context,
    await inspectAdminQaStudent(context.env.DB, email),
  )
})

adminQaStudentRoutes.post('/qa-students/configure', async (context) => {
  const input = await parseJsonBody(context, configureQaStudentSchema)
  return successResponse(
    context,
    await configureAdminQaStudent(
      context.env.DB,
      context.get('authUser'),
      input,
      context.get('requestId'),
    ),
  )
})
