import { Hono } from 'hono'

import {
  requireAdmin,
  requireAuthentication,
} from '../middleware/auth.middleware'
import { getPublicUser } from '../services/auth.service'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use('*', requireAuthentication, requireAdmin)

adminRoutes.get('/auth-check', (context) =>
  successResponse(context, {
    authorized: true,
    user: getPublicUser(context.get('authUser')),
  }),
)
