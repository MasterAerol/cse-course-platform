import { Hono } from 'hono'

import type { AppEnv } from '../types/app'

export const healthRoutes = new Hono<AppEnv>()

healthRoutes.get('/', (context) =>
  context.json({
    success: true,
    data: {
      status: 'ok',
    },
  }),
)
