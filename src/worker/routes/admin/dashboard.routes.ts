import { Hono } from 'hono'

import { getAdminDashboard } from '../../services/admin/admin-content.service'
import type { AppEnv } from '../../types/app'
import { successResponse } from '../../utils/responses'

export const adminDashboardRoutes = new Hono<AppEnv>()

adminDashboardRoutes.get('/', async (context) =>
  successResponse(context, await getAdminDashboard(context.env.DB)),
)
