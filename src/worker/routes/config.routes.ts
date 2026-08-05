import { Hono } from 'hono'

import { getRegistrationMode } from '../config/registration'
import type { AppEnv } from '../types/app'
import { successResponse } from '../utils/responses'

export const configRoutes = new Hono<AppEnv>()

configRoutes.get('/', (context) =>
  successResponse(context, {
    registrationMode: getRegistrationMode(context.env),
  }),
)