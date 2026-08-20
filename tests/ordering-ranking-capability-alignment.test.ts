import { describe, expect, it } from 'vitest'
import { resolveTeachingPublisher } from '../scripts/lib/teaching-publisher-registry.mjs'
import { classifyChangedFiles } from '../scripts/lib/safe-release.mjs'
import routes from '../src/worker/routes/admin/lesson-block.routes.ts?raw'
import service from '../src/worker/services/admin/admin-content.service.ts?raw'
import publisher from '../scripts/create-and-publish-ordering-ranking-teaching-system.mjs?raw'

describe('Ordering and Ranking Teaching Release capability', () => {
  it('uses the deployed shared Analytical capability and atomic reconciliation route', () => {
    expect(routes).toContain('/lessons/:lessonId/analytical-teaching-system-v1/capability')
    expect(routes).toContain('/lessons/:lessonId/analytical-teaching-system-v1')
    expect(service).toContain("'ordering-and-ranking'")
    expect(service).toContain("subject?.slug !== 'analytical-ability'")
    expect(service).toContain('reconcileTeachingSystemLessonBlocksWithAudit')
    expect(service).toContain('ANALYTICAL_TEACHING_SYSTEM_TARGET_MISMATCH')
  })
  it('registers the exact confirmation and secure credential policy', () => {
    const resolved = resolveTeachingPublisher('orderingRanking')
    expect(resolved).toMatchObject({
      topicSlug:'ordering-and-ranking',
      script:'scripts/create-and-publish-ordering-ranking-teaching-system.mjs',
      passwordEnv:'CSE_ORDERING_RANKING_ADMIN_PASSWORD',
      confirmation:'publish-ordering-and-ranking-teaching-system-v1',
      capabilityCheck:true,
    })
    expect(publisher).not.toMatch(/password\s*=\s*['"][^'"]+['"]/u)
  })
  it('keeps the Topic 6 release developer-only while retaining deployed runtime coverage', () => {
    const risk = classifyChangedFiles([
      'scripts/create-and-publish-ordering-ranking-teaching-system.mjs',
      'scripts/lib/ordering-ranking-teaching-system-content.mjs',
      'tests/ordering-ranking-teaching-system.test.ts',
    ])
    expect(risk.deploymentRequired).toBe(false)
    expect(risk.publisherRequired).toBe(true)
  })
})
