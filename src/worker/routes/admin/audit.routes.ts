import { Hono } from 'hono'

import { auditLogFilterSchema } from '../../schemas/admin/content-admin.schemas'
import { getAdminAuditLogs } from '../../services/admin/audit-log.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'
import { parseValidatedInput } from '../../utils/validation'

export const adminAuditRoutes = new Hono<AppEnv>()

adminAuditRoutes.get('/audit-logs', async (context) => {
  const filters = parseValidatedInput(
    auditLogFilterSchema.safeParse({
      action: context.req.query('action'),
      entityType: context.req.query('entityType'),
      actor: context.req.query('actor'),
      from: context.req.query('from'),
      to: context.req.query('to'),
      limit: context.req.query('limit'),
      offset: context.req.query('offset'),
    }),
  )

  return successResponse(
    context,
    await getAdminAuditLogs(context.env.DB, filters),
  )
})
