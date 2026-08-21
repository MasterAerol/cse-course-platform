import { createMiddleware } from 'hono/factory'

import type { CommercialFeature } from '../domain/commercial-access'
import { assertCommercialFeatureAccess } from '../services/commercial.service'
import type { AppEnv } from '../types/app'

export function requireCommercialFeature(feature: CommercialFeature) {
  return createMiddleware<AppEnv>(async (context, next) => {
    const principal = context.get('authUser')
    if (principal.role === 'student') {
      await assertCommercialFeatureAccess(
        context.env.DB,
        principal.internalUserId,
        feature,
      )
    }
    await next()
  })
}
